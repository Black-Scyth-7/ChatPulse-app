/**
 * Presence plumbing shared between the realtime server (server/index.ts) and the
 * Next.js API route handlers.
 *
 * The two run in the same Node process, but Next bundles route handlers
 * separately from the tsx-loaded custom server, so a plain module-level variable
 * would not be shared between them. We stash the live Socket.io server on
 * `globalThis` — the same trick lib/prisma.ts uses for its client — so that
 * `PATCH /api/users/me` can broadcast a `presence:changed` event through the
 * running server without holding its own socket.
 */
import type { Server } from "socket.io";
import type { UserStatus } from "@prisma/client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PresenceStatus,
  SocketData,
} from "./socket-events";
import type { ChannelSummary } from "./types";

/** The concrete Socket.io server type used across ChatPulse. */
export type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

const globalForIo = globalThis as unknown as { chatpulseIo?: AppServer };

/** Called once by the custom server on startup so API routes can reach io. */
export function setIoServer(io: AppServer): void {
  globalForIo.chatpulseIo = io;
}

/** The live Socket.io server, or undefined if the realtime server isn't up. */
export function getIoServer(): AppServer | undefined {
  return globalForIo.chatpulseIo;
}

/** DB enum (UPPERCASE) → wire/REST status (lowercase). */
export function toPresenceStatus(status: UserStatus): PresenceStatus {
  return status.toLowerCase() as PresenceStatus;
}

/** Wire/REST status (lowercase) → DB enum (UPPERCASE). */
export function toUserStatus(status: PresenceStatus): UserStatus {
  return status.toUpperCase() as UserStatus;
}

/**
 * Broadcast a presence change to every connected client. A no-op if the
 * realtime server isn't running (e.g. serverless/preview), so callers don't
 * have to guard.
 */
export function broadcastPresence(userId: string, status: PresenceStatus): void {
  getIoServer()?.emit("presence:changed", { userId, status });
}

/**
 * Notify a channel's members that it was deleted, so every connected member can
 * drop it from their sidebar (and navigate away if it's the open channel). The
 * emit targets the channel room, which still holds each member's socket at the
 * moment of deletion — DB cascade deletes don't touch in-memory room state. A
 * no-op if the realtime server isn't running.
 */
export function broadcastChannelDeleted(channelId: string): void {
  getIoServer()
    ?.to(`channel:${channelId}`)
    .emit("channel:deleted", { channelId });
}

/**
 * Notify a freshly-invited user that they were added to a channel, so their
 * connected clients can add it to the sidebar without a refresh. Targets the
 * user's personal room (`user:{userId}`), which they join on connect regardless
 * of channel membership. `channel` is shaped from the invited user's point of
 * view (their role and unread count). A no-op if the realtime server isn't up.
 */
export function broadcastChannelInvited(
  userId: string,
  channel: ChannelSummary,
): void {
  getIoServer()
    ?.to(`user:${userId}`)
    .emit("channel:invited", { channelId: channel.id, channel });
}

/**
 * Notify a channel's members that `userId` read everything up to `readUpTo`, so
 * message authors can flip their own check marks to READ. Emitted from the REST
 * read route (POST /api/channels/[id]/read), which runs in the Next bundle and
 * reaches the live server through the shared io. No-op if the server isn't up.
 */
export function broadcastMessageRead(
  channelId: string,
  userId: string,
  readUpTo: string,
): void {
  getIoServer()
    ?.to(`channel:${channelId}`)
    .emit("message:read", { channelId, userId, readUpTo });
}

/** DM counterpart of {@link broadcastMessageRead}, targeting the DM room. */
export function broadcastDmRead(
  conversationId: string,
  userId: string,
  readUpTo: string,
): void {
  getIoServer()
    ?.to(`dm:${conversationId}`)
    .emit("dm:read", { conversationId, userId, readUpTo });
}
