/**
 * ChatPulse custom server — runs Next.js and Socket.io on a single HTTP server.
 *
 * Started with `pnpm dev` (tsx server/index.ts). Next.js handles all HTTP
 * routes; Socket.io is attached to the same server for realtime messaging,
 * presence, and typing indicators.
 *
 * Auth: socket connections are authenticated against the NextAuth (Auth.js v5)
 * JWT session. The client sends the session token (or the browser forwards the
 * session cookie); the server decodes it with the same AUTH_SECRET NextAuth
 * uses and rejects anything it cannot verify.
 *
 * Rooms: each channel maps to `channel:{channelId}`. A socket only joins a
 * channel room after its membership is verified, so broadcasts to that room
 * reach exactly the channel's members.
 */
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { getToken } from "next-auth/jwt";
import { prisma } from "../lib/prisma";
import {
  messageSendSchema,
  messageEditSchema,
  messageDeleteSchema,
  channelRefSchema,
} from "../lib/validators/message";
import { dmSendSchema } from "../lib/validators/dm";
import { presenceUpdateSchema } from "../lib/validators/presence";
import { setIoServer, toUserStatus } from "../lib/presence";
import { sendPushNotification } from "../lib/firebase";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SerializedMessage,
  SerializedDirectMessage,
  MessageStatus,
  SocketData,
} from "../lib/socket-events";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "localhost";
const port = Number(process.env.PORT ?? 3000);

/** How long a user may be fully disconnected before we mark them offline. */
const OFFLINE_GRACE_MS = 30_000;

const room = (channelId: string) => `channel:${channelId}`;
const dmRoom = (conversationId: string) => `dm:${conversationId}`;

/** Max characters in a push-notification body preview (mirrors the API). */
const PUSH_PREVIEW_MAX = 100;

/** Truncate a message body for the push preview, matching the in-app preview. */
function pushPreview(body: string): string {
  return body.length > PUSH_PREVIEW_MAX
    ? `${body.slice(0, PUSH_PREVIEW_MAX)}…`
    : body;
}

/**
 * Whether a recipient's stored notification mode permits a push of this type.
 * Mirrors lib/notifications.ts `shouldNotify`: `muted` suppresses everything and
 * `dm` allows only direct messages. This backs the "no notification for muted
 * conversations" acceptance criterion at the app's (global) mute granularity.
 */
function pushAllowedByMode(
  mode: string,
  type: "channel" | "dm",
): boolean {
  if (mode === "muted") return false;
  if (mode === "dm") return type === "dm";
  return true;
}

/** Shape a Prisma message (with its author) for the wire. */
function serializeMessage(m: {
  id: string;
  channelId: string;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
  status: MessageStatus;
  author: { id: string; name: string | null; image: string | null };
}): SerializedMessage {
  return {
    id: m.id,
    channelId: m.channelId,
    body: m.body,
    author: { id: m.author.id, name: m.author.name, image: m.author.image },
    createdAt: m.createdAt.toISOString(),
    editedAt: m.editedAt ? m.editedAt.toISOString() : null,
    status: m.status,
  };
}

/** Shape a Prisma direct message (with its author) for the wire. */
function serializeDirectMessage(m: {
  id: string;
  conversationId: string;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
  status: MessageStatus;
  author: { id: string; name: string | null; image: string | null };
}): SerializedDirectMessage {
  return {
    id: m.id,
    conversationId: m.conversationId,
    body: m.body,
    author: { id: m.author.id, name: m.author.name, image: m.author.image },
    createdAt: m.createdAt.toISOString(),
    editedAt: m.editedAt ? m.editedAt.toISOString() : null,
    status: m.status,
  };
}

const authorSelect = {
  author: { select: { id: true, name: true, image: true } },
} as const;

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  // prepare() also loads the .env files into process.env, so AUTH_SECRET and
  // DATABASE_URL are available by the time any socket connects or we query.
  await app.prepare();

  const httpServer = createServer((req, res) => {
    handle(req, res, parse(req.url ?? "/", true));
  });

  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL ?? `http://${hostname}:${port}`,
      credentials: true,
    },
  });

  // Publish io so the Next.js API routes (which are bundled separately) can
  // broadcast presence changes through the same server. See lib/presence.ts.
  setIoServer(io);

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  const secureCookie = (
    process.env.NEXTAUTH_URL ??
    process.env.AUTH_URL ??
    ""
  ).startsWith("https://");

  // --- Presence bookkeeping ------------------------------------------------
  // A user may hold several sockets (tabs/devices). We only consider them
  // offline once their last socket has been gone for the grace period.
  const socketsByUser = new Map<string, Set<string>>();
  const offlineTimers = new Map<string, NodeJS.Timeout>();

  /** Channel rooms a user belongs to, for scoping presence broadcasts. */
  async function channelRoomsForUser(userId: string): Promise<string[]> {
    const memberships = await prisma.channelMember.findMany({
      where: { userId },
      select: { channelId: true },
    });
    return memberships.map((m) => room(m.channelId));
  }

  async function isMember(userId: string, channelId: string): Promise<boolean> {
    const membership = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
      select: { id: true },
    });
    return membership !== null;
  }

  /** DM rooms a user belongs to, joined on connect so `dm:new` reaches them. */
  async function dmRoomsForUser(userId: string): Promise<string[]> {
    const parts = await prisma.directConversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });
    return parts.map((p) => dmRoom(p.conversationId));
  }

  async function isParticipant(
    userId: string,
    conversationId: string,
  ): Promise<boolean> {
    const participation = await prisma.directConversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      select: { id: true },
    });
    return participation !== null;
  }

  /**
   * Mark a channel's messages DELIVERED for `recipientId` (WhatsApp double check).
   * A recipient connecting to the room means every message authored by someone
   * else has reached their client. We bump those SENT rows to DELIVERED and, if
   * any changed, tell the room how far delivery now reaches so each author flips
   * their own check marks. READ rows are left untouched (READ outranks DELIVERED).
   */
  async function deliverChannel(
    recipientId: string,
    channelId: string,
  ): Promise<void> {
    const res = await prisma.message.updateMany({
      where: {
        channelId,
        authorId: { not: recipientId },
        status: "SENT",
        deletedAt: null,
      },
      data: { status: "DELIVERED" },
    });
    if (res.count === 0) return;
    const latest = await prisma.message.findFirst({
      where: { channelId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (latest) {
      io.to(room(channelId)).emit("message:delivered", {
        channelId,
        userId: recipientId,
        deliveredUpTo: latest.id,
      });
    }
  }

  /** DM counterpart of {@link deliverChannel}. */
  async function deliverConversation(
    recipientId: string,
    conversationId: string,
  ): Promise<void> {
    const res = await prisma.directMessage.updateMany({
      where: {
        conversationId,
        authorId: { not: recipientId },
        status: "SENT",
        deletedAt: null,
      },
      data: { status: "DELIVERED" },
    });
    if (res.count === 0) return;
    const latest = await prisma.directMessage.findFirst({
      where: { conversationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (latest) {
      io.to(dmRoom(conversationId)).emit("dm:delivered", {
        conversationId,
        userId: recipientId,
        deliveredUpTo: latest.id,
      });
    }
  }

  // --- Offline push notifications (FCM) ------------------------------------
  // A recipient with no live socket is "offline" — the app is backgrounded or
  // closed on their device — so the in-app/browser notification path can't
  // reach them. For those users we fall back to a Firebase Cloud Messaging push
  // (see lib/firebase.ts). Users with a live socket already get the realtime
  // `message:new` / `dm:new` event and its in-app toast, so we skip them.

  /** Send a push to one recipient if they're offline and opted in. */
  async function pushToRecipient(
    user: { id: string; pushToken: string | null; notificationMode: string },
    ctx: {
      conversationId: string;
      type: "channel" | "dm";
      senderName: string;
      body: string;
    },
  ): Promise<void> {
    // Online elsewhere: the realtime event + in-app notification cover it.
    if (socketsByUser.has(user.id)) return;
    if (!user.pushToken) return;
    if (!pushAllowedByMode(user.notificationMode, ctx.type)) return;

    const result = await sendPushNotification({
      token: user.pushToken,
      title: ctx.senderName,
      body: pushPreview(ctx.body),
      conversationId: ctx.conversationId,
      type: ctx.type,
    });
    // The token is dead (app uninstalled / permission revoked): drop it so we
    // stop pushing to it. FCM rotates a fresh one on next launch.
    if (result === "unregistered") {
      await prisma.user
        .update({ where: { id: user.id }, data: { pushToken: null } })
        .catch((e) => console.error("[socket] clear stale push token:", e));
    }
  }

  /** Push a new channel message to every offline member except the author. */
  async function pushOfflineChannelMembers(params: {
    channelId: string;
    authorId: string;
    senderName: string;
    body: string;
  }): Promise<void> {
    const members = await prisma.channelMember.findMany({
      where: {
        channelId: params.channelId,
        userId: { not: params.authorId },
        user: { pushToken: { not: null } },
      },
      select: {
        user: {
          select: { id: true, pushToken: true, notificationMode: true },
        },
      },
    });
    await Promise.all(
      members.map((m) =>
        pushToRecipient(m.user, {
          conversationId: params.channelId,
          type: "channel",
          senderName: params.senderName,
          body: params.body,
        }),
      ),
    );
  }

  /** Push a new DM to every offline participant except the author. */
  async function pushOfflineDmParticipants(params: {
    conversationId: string;
    authorId: string;
    senderName: string;
    body: string;
  }): Promise<void> {
    const parts = await prisma.directConversationParticipant.findMany({
      where: {
        conversationId: params.conversationId,
        userId: { not: params.authorId },
        user: { pushToken: { not: null } },
      },
      select: {
        user: {
          select: { id: true, pushToken: true, notificationMode: true },
        },
      },
    });
    await Promise.all(
      parts.map((p) =>
        pushToRecipient(p.user, {
          conversationId: params.conversationId,
          type: "dm",
          senderName: params.senderName,
          body: params.body,
        }),
      ),
    );
  }

  // --- Auth middleware -----------------------------------------------------
  io.use(async (socket, nextFn) => {
    try {
      const headers = new Headers();
      const cookie = socket.handshake.headers.cookie;
      if (cookie) headers.set("cookie", cookie);
      // Allow the client to pass the session token explicitly (auth.token).
      const bearer =
        typeof socket.handshake.auth?.token === "string"
          ? socket.handshake.auth.token
          : undefined;
      if (bearer) headers.set("authorization", `Bearer ${bearer}`);

      const token = await getToken({
        req: { headers },
        secret,
        secureCookie,
      });

      const userId =
        (token?.id as string | undefined) ?? (token?.sub as string | undefined);
      if (!userId) {
        return nextFn(new Error("Unauthorized"));
      }
      socket.data.userId = userId;
      nextFn();
    } catch (err) {
      console.error("[socket] auth error:", err);
      nextFn(new Error("Unauthorized"));
    }
  });

  // --- Connection lifecycle ------------------------------------------------
  io.on("connection", async (socket) => {
    const userId = socket.data.userId;

    // A reconnect within the grace window cancels the pending offline flip.
    const pending = offlineTimers.get(userId);
    if (pending) {
      clearTimeout(pending);
      offlineTimers.delete(userId);
    }

    let sockets = socketsByUser.get(userId);
    const firstConnection = !sockets || sockets.size === 0;
    if (!sockets) {
      sockets = new Set();
      socketsByUser.set(userId, sockets);
    }
    sockets.add(socket.id);

    // Join the user's personal room so events can target them directly even
    // when they aren't in the relevant channel room yet (e.g. channel invites).
    socket.join(`user:${userId}`);

    // Auto-join every channel room the user is a member of.
    const rooms = await channelRoomsForUser(userId);
    for (const r of rooms) socket.join(r);

    // Auto-join every DM conversation room the user participates in, so a
    // `dm:new` broadcast reaches both participants wherever they're connected.
    const dmRooms = await dmRoomsForUser(userId);
    for (const r of dmRooms) socket.join(r);

    // Now that this recipient is connected, everything they can see is at least
    // DELIVERED. Idempotent: a second tab finds nothing left in SENT and no-ops.
    for (const r of rooms) {
      await deliverChannel(userId, r.slice("channel:".length)).catch((e) =>
        console.error("[socket] deliverChannel failed:", e),
      );
    }
    for (const r of dmRooms) {
      await deliverConversation(userId, r.slice("dm:".length)).catch((e) =>
        console.error("[socket] deliverConversation failed:", e),
      );
    }

    if (firstConnection) {
      await prisma.user
        .update({ where: { id: userId }, data: { status: "ONLINE" } })
        .catch((e) => console.error("[socket] set online failed:", e));
      // Presence is global: every connected client tracks every user's status
      // (DM lists, member lists, avatars), so broadcast to all, not just rooms.
      io.emit("presence:changed", { userId, status: "online" });
    }

    if (dev) console.log(`[socket] connected: ${socket.id} (user ${userId})`);

    // -- message:send -------------------------------------------------------
    socket.on("message:send", async (data, ack) => {
      try {
        const parsed = messageSendSchema.safeParse(data);
        if (!parsed.success) {
          return ack?.({ ok: false, error: "Invalid message payload" });
        }
        const { channelId, body } = parsed.data;
        if (!(await isMember(userId, channelId))) {
          return ack?.({ ok: false, error: "Not a member of this channel" });
        }
        const created = await prisma.message.create({
          data: { body, channelId, authorId: userId },
          include: authorSelect,
        });
        const payload = serializeMessage(created);
        io.to(room(channelId)).emit("message:new", payload);
        ack?.({ ok: true, message: payload });
        // Reach offline members via FCM; non-blocking so the ack isn't delayed.
        void pushOfflineChannelMembers({
          channelId,
          authorId: userId,
          senderName: created.author.name ?? "New message",
          body,
        }).catch((e) =>
          console.error("[socket] channel offline push failed:", e),
        );
      } catch (err) {
        console.error("[socket] message:send failed:", err);
        ack?.({ ok: false, error: "Failed to send message" });
      }
    });

    // -- message:edit -------------------------------------------------------
    socket.on("message:edit", async (data, ack) => {
      try {
        const parsed = messageEditSchema.safeParse(data);
        if (!parsed.success) {
          return ack?.({ ok: false, error: "Invalid edit payload" });
        }
        const { messageId, body } = parsed.data;
        const existing = await prisma.message.findUnique({
          where: { id: messageId },
          select: { authorId: true, channelId: true, deletedAt: true },
        });
        if (!existing || existing.deletedAt) {
          return ack?.({ ok: false, error: "Message not found" });
        }
        if (existing.authorId !== userId) {
          return ack?.({ ok: false, error: "You can only edit your own messages" });
        }
        const updated = await prisma.message.update({
          where: { id: messageId },
          data: { body, editedAt: new Date() },
          include: authorSelect,
        });
        const payload = serializeMessage(updated);
        io.to(room(existing.channelId)).emit("message:updated", payload);
        ack?.({ ok: true, message: payload });
      } catch (err) {
        console.error("[socket] message:edit failed:", err);
        ack?.({ ok: false, error: "Failed to edit message" });
      }
    });

    // -- message:delete -----------------------------------------------------
    socket.on("message:delete", async (data, ack) => {
      try {
        const parsed = messageDeleteSchema.safeParse(data);
        if (!parsed.success) {
          return ack?.({ ok: false, error: "Invalid delete payload" });
        }
        const { messageId } = parsed.data;
        const existing = await prisma.message.findUnique({
          where: { id: messageId },
          select: { authorId: true, channelId: true, deletedAt: true },
        });
        if (!existing || existing.deletedAt) {
          return ack?.({ ok: false, error: "Message not found" });
        }
        if (existing.authorId !== userId) {
          return ack?.({
            ok: false,
            error: "You can only delete your own messages",
          });
        }
        await prisma.message.update({
          where: { id: messageId },
          data: { deletedAt: new Date() },
        });
        io.to(room(existing.channelId)).emit("message:deleted", {
          id: messageId,
          channelId: existing.channelId,
        });
        ack?.({ ok: true });
      } catch (err) {
        console.error("[socket] message:delete failed:", err);
        ack?.({ ok: false, error: "Failed to delete message" });
      }
    });

    // -- dm:send ------------------------------------------------------------
    socket.on("dm:send", async (data, ack) => {
      try {
        const parsed = dmSendSchema.safeParse(data);
        if (!parsed.success) {
          return ack?.({ ok: false, error: "Invalid DM payload" });
        }
        const { conversationId, content } = parsed.data;
        if (!(await isParticipant(userId, conversationId))) {
          return ack?.({
            ok: false,
            error: "Not a participant in this conversation",
          });
        }
        const created = await prisma.directMessage.create({
          data: { body: content, conversationId, authorId: userId },
          include: authorSelect,
        });
        // Bump the conversation so DM lists order by most-recent activity.
        await prisma.directConversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });
        const payload = serializeDirectMessage(created);
        io.to(dmRoom(conversationId)).emit("dm:new", payload);
        ack?.({ ok: true, message: payload });
        // Reach the offline participant via FCM; non-blocking.
        void pushOfflineDmParticipants({
          conversationId,
          authorId: userId,
          senderName: created.author.name ?? "New message",
          body: content,
        }).catch((e) => console.error("[socket] dm offline push failed:", e));
      } catch (err) {
        console.error("[socket] dm:send failed:", err);
        ack?.({ ok: false, error: "Failed to send direct message" });
      }
    });

    // -- typing:start / typing:stop ----------------------------------------
    socket.on("typing:start", (data) => {
      const parsed = channelRefSchema.safeParse(data);
      if (!parsed.success) return;
      const { channelId } = parsed.data;
      // Exclude the sender — they don't need their own typing echo.
      socket.to(room(channelId)).emit("typing:update", {
        channelId,
        userId,
        isTyping: true,
      });
    });

    socket.on("typing:stop", (data) => {
      const parsed = channelRefSchema.safeParse(data);
      if (!parsed.success) return;
      const { channelId } = parsed.data;
      socket.to(room(channelId)).emit("typing:update", {
        channelId,
        userId,
        isTyping: false,
      });
    });

    // -- presence:update ----------------------------------------------------
    socket.on("presence:update", async (data) => {
      const parsed = presenceUpdateSchema.safeParse(data);
      if (!parsed.success) return;
      const { status } = parsed.data;
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { status: toUserStatus(status), lastSeen: new Date() },
        });
        io.emit("presence:changed", { userId, status });
      } catch (err) {
        console.error("[socket] presence:update failed:", err);
      }
    });

    // -- channel:join / channel:leave --------------------------------------
    socket.on("channel:join", async (data, ack) => {
      const parsed = channelRefSchema.safeParse(data);
      if (!parsed.success) {
        return ack?.({ ok: false, error: "Invalid channel payload" });
      }
      const { channelId } = parsed.data;
      if (!(await isMember(userId, channelId))) {
        return ack?.({ ok: false, error: "Not a member of this channel" });
      }
      socket.join(room(channelId));
      // Joining the room delivers the channel's backlog to this recipient.
      await deliverChannel(userId, channelId).catch((e) =>
        console.error("[socket] deliverChannel (join) failed:", e),
      );
      ack?.({ ok: true });
    });

    socket.on("channel:leave", (data, ack) => {
      const parsed = channelRefSchema.safeParse(data);
      if (!parsed.success) {
        return ack?.({ ok: false, error: "Invalid channel payload" });
      }
      socket.leave(room(parsed.data.channelId));
      ack?.({ ok: true });
    });

    // -- disconnect ---------------------------------------------------------
    socket.on("disconnect", (reason) => {
      if (dev) console.log(`[socket] disconnected: ${socket.id} (${reason})`);
      const set = socketsByUser.get(userId);
      if (!set) return;
      set.delete(socket.id);
      if (set.size > 0) return; // still connected elsewhere

      socketsByUser.delete(userId);
      // Grace period: only mark offline if they don't reconnect in time.
      const timer = setTimeout(async () => {
        offlineTimers.delete(userId);
        if (socketsByUser.has(userId)) return; // reconnected during the wait
        try {
          await prisma.user.update({
            where: { id: userId },
            data: { status: "OFFLINE", lastSeen: new Date() },
          });
          io.emit("presence:changed", { userId, status: "offline" });
        } catch (err) {
          console.error("[socket] mark offline failed:", err);
        }
      }, OFFLINE_GRACE_MS);
      offlineTimers.set(userId, timer);
    });
  });

  httpServer.listen(port, () => {
    if (dev) {
      console.log(
        `[chatpulse] ready on http://${hostname}:${port} (Next + Socket.io)`,
      );
    }
  });
}

main().catch((err) => {
  console.error("[chatpulse] fatal startup error:", err);
  process.exit(1);
});
