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
