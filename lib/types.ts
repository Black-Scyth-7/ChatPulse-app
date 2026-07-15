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
