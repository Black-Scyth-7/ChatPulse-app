/**
 * Socket.io event contracts shared between the realtime server (server/index.ts)
 * and any client that talks to it. Keeping the payload shapes here means the
 * server and the future client hook agree on the wire format and event names.
 *
 * Room convention: every channel maps to the room `channel:{channelId}`. A
 * socket is joined to a channel room only after its membership is verified, so
 * `io.to("channel:{id}")` reaches exactly the channel's members. Each socket
 * also joins its owner's personal room `user:{userId}`, so events can be
 * addressed to a specific user regardless of channel membership (e.g. inviting
 * them to a channel they aren't in yet).
 */

import type { ChannelSummary, MessageStatus } from "./types";

// Re-exported so the realtime server can import the delivery-status union
// alongside the wire event contracts from a single module.
export type { MessageStatus };

/** Presence values as broadcast over the wire (lowercase; DB uses UserStatus). */
export type PresenceStatus = "online" | "offline" | "away";

/** A channel message shaped for realtime delivery. */
export interface SerializedMessage {
  id: string;
  channelId: string;
  body: string;
  author: { id: string; name: string | null; image: string | null };
  createdAt: string;
  /** Non-null once the message has been edited. */
  editedAt: string | null;
  /** Delivery status for the author's read-receipt check marks. */
  status: MessageStatus;
}

/** A direct message shaped for realtime delivery. */
export interface SerializedDirectMessage {
  id: string;
  conversationId: string;
  body: string;
  author: { id: string; name: string | null; image: string | null };
  createdAt: string;
  /** Non-null once the message has been edited. */
  editedAt: string | null;
  /** Delivery status for the author's read-receipt check marks. */
  status: MessageStatus;
}

/** Standard ack envelope returned to the emitter via a callback. */
export interface Ack {
  ok: boolean;
  error?: string;
}

/** Ack for message mutations, echoing the resulting message on success. */
export interface MessageAck extends Ack {
  message?: SerializedMessage;
}

/** Ack for DM sends, echoing the resulting direct message on success. */
export interface DirectMessageAck extends Ack {
  message?: SerializedDirectMessage;
}

/** Events the client may emit to the server. */
export interface ClientToServerEvents {
  "message:send": (
    data: { channelId: string; body: string },
    ack?: (res: MessageAck) => void,
  ) => void;
  "message:edit": (
    data: { messageId: string; body: string },
    ack?: (res: MessageAck) => void,
  ) => void;
  "message:delete": (
    data: { messageId: string },
    ack?: (res: Ack) => void,
  ) => void;
  "typing:start": (data: { channelId: string }) => void;
  "typing:stop": (data: { channelId: string }) => void;
  "presence:update": (data: { status: PresenceStatus }) => void;
  "channel:join": (data: { channelId: string }, ack?: (res: Ack) => void) => void;
  "channel:leave": (data: { channelId: string }, ack?: (res: Ack) => void) => void;
  "dm:send": (
    data: { conversationId: string; content: string },
    ack?: (res: DirectMessageAck) => void,
  ) => void;
}

/** Events the server broadcasts to clients. */
export interface ServerToClientEvents {
  "presence:changed": (data: { userId: string; status: PresenceStatus }) => void;
  "message:new": (data: SerializedMessage) => void;
  "message:updated": (data: SerializedMessage) => void;
  "message:deleted": (data: { id: string; channelId: string }) => void;
  /** A channel was deleted by its owner; members should drop it from their UI. */
  "channel:deleted": (data: { channelId: string }) => void;
  /**
   * The recipient was invited to (added as a member of) a channel; their client
   * should add it to the sidebar. Addressed to the invited user's personal room.
   */
  "channel:invited": (data: {
    channelId: string;
    channel: ChannelSummary;
  }) => void;
  "typing:update": (data: {
    channelId: string;
    userId: string;
    isTyping: boolean;
  }) => void;
  "dm:new": (data: SerializedDirectMessage) => void;
  /**
   * A recipient's client connected to a channel room, so every message in that
   * channel authored by someone else is now (at least) DELIVERED. Authors update
   * their check marks for their own messages up to `deliveredUpTo`.
   */
  "message:delivered": (data: {
    channelId: string;
    userId: string;
    deliveredUpTo: string;
  }) => void;
  /**
   * A recipient opened a channel, marking every earlier message authored by
   * someone else READ. Authors flip their own messages up to `readUpTo` to READ.
   */
  "message:read": (data: {
    channelId: string;
    userId: string;
    readUpTo: string;
  }) => void;
  /** DM equivalent of `message:delivered`. */
  "dm:delivered": (data: {
    conversationId: string;
    userId: string;
    deliveredUpTo: string;
  }) => void;
  /** DM equivalent of `message:read`. */
  "dm:read": (data: {
    conversationId: string;
    userId: string;
    readUpTo: string;
  }) => void;
}

/** Per-socket state populated by the auth middleware. */
export interface SocketData {
  userId: string;
}
