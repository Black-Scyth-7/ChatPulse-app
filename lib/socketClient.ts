import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "./socket-events";

/**
 * Shared browser Socket.io client.
 *
 * The realtime server (server/index.ts) runs on the same origin as Next.js, so
 * `io()` with no URL connects back to it and the browser forwards the NextAuth
 * session cookie for the handshake auth middleware. Reconnection is handled by
 * Socket.io itself (enabled by default).
 *
 * A single connection is shared across every hook that needs it, retained by a
 * reference count so the socket connects on the first mount and disconnects
 * once the last consumer unmounts.
 */

export type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: ChatSocket | null = null;
let refCount = 0;

/** Return the shared socket, creating it (disconnected) on first use. */
function getSocket(): ChatSocket {
  if (!socket) {
    socket = io({
      // Same-origin connection; the cookie handshake authenticates the user.
      withCredentials: true,
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

/** Register a consumer and ensure the socket is connecting. */
export function retainSocket(): ChatSocket {
  const s = getSocket();
  refCount += 1;
  if (!s.connected) s.connect();
  return s;
}

/** Release a consumer; disconnect once none remain. */
export function releaseSocket(): void {
  refCount -= 1;
  if (refCount <= 0) {
    refCount = 0;
    socket?.disconnect();
  }
}
