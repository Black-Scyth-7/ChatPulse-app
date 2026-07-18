/**
 * Shared domain types for ChatPulse. Expanded as features land; kept minimal
 * here so the scaffold typechecks and other modules have something to import.
 */

export type ID = string;

export interface UserSummary {
  id: ID;
  name: string | null;
  email: string | null;
  image: string | null;
}

export type ChannelRole = "OWNER" | "ADMIN" | "MEMBER";

/**
 * Delivery status behind the WhatsApp-style read-receipt check marks. Mirrors
 * the Prisma `MessageStatus` enum: SENT (single check) → DELIVERED (double
 * check) → READ (blue double check).
 */
export type MessageStatus = "SENT" | "DELIVERED" | "READ";

export interface Channel {
  id: ID;
  name: string;
  description: string | null;
  isPrivate: boolean;
  createdById: ID;
  createdAt: string;
  updatedAt: string;
}

/** A channel plus the requesting user's membership context, for list views. */
export interface ChannelSummary extends Channel {
  memberCount: number;
  /** The requesting user's role in the channel, when they are a member. */
  role?: ChannelRole;
  /** Messages authored by others after the user's lastReadAt in this channel. */
  unreadCount: number;
}

/** A single member entry in a channel's member list. */
export interface ChannelMemberSummary {
  userId: ID;
  role: ChannelRole;
  joinedAt: string;
  user: UserSummary;
}

/** Full channel detail: the channel plus its member list. */
export interface ChannelDetail extends Channel {
  members: ChannelMemberSummary[];
}

export interface Message {
  id: ID;
  channelId: ID | null;
  authorId: ID;
  body: string;
  createdAt: string;
}

/** A channel message with its author, as returned by the messages history API. */
export interface MessageWithAuthor {
  id: ID;
  channelId: ID;
  authorId: ID;
  body: string;
  editedAt: string | null;
  createdAt: string;
  status: MessageStatus;
  author: UserSummary;
}

/** Paginated channel message history response. */
export interface MessagesPage {
  messages: MessageWithAuthor[];
  nextCursor: string | null;
}

/** A direct message with its author, as returned by the DM history API. */
export interface DirectMessageWithAuthor {
  id: ID;
  conversationId: ID;
  authorId: ID;
  body: string;
  editedAt: string | null;
  createdAt: string;
  status: MessageStatus;
  author: UserSummary;
}

/** Paginated DM history response (same shape/pattern as MessagesPage). */
export interface DirectMessagesPage {
  messages: DirectMessageWithAuthor[];
  nextCursor: string | null;
}

/** A short preview of the most recent message in a conversation, for DM lists. */
export interface DirectMessagePreview {
  id: ID;
  authorId: ID;
  body: string;
  createdAt: string;
}

/**
 * A DM conversation as shown in the sidebar list: the other participant plus a
 * preview of the last message. `otherUser` is null in the degenerate case of a
 * self-conversation or one whose partner account was deleted.
 */
export interface DmConversationSummary {
  id: ID;
  otherUser: UserSummary | null;
  lastMessage: DirectMessagePreview | null;
  updatedAt: string;
}
