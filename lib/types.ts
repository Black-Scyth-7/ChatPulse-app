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

export interface Channel {
  id: ID;
  name: string;
  createdAt: string;
}

export interface Message {
  id: ID;
  channelId: ID | null;
  authorId: ID;
  body: string;
  createdAt: string;
}
