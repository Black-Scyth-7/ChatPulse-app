"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "./socket-events";
import {
  releaseSocket,
  retainSocket,
  type ChatSocket,
} from "./socketClient";

type ClientEvent = keyof ClientToServerEvents;
type ServerEvent = keyof ServerToClientEvents;

export interface UseSocket {
  /** The shared socket instance (stable across renders). */
  socket: ChatSocket;
  /** Whether the socket currently has a live connection. */
  connected: boolean;
  /** Emit a client→server event. */
  emit: <E extends ClientEvent>(
    event: E,
    ...args: Parameters<ClientToServerEvents[E]>
  ) => void;
  /** Subscribe to a server→client event. */
  on: <E extends ServerEvent>(
    event: E,
    handler: ServerToClientEvents[E],
  ) => void;
  /** Unsubscribe from a server→client event. */
  off: <E extends ServerEvent>(
    event: E,
    handler: ServerToClientEvents[E],
  ) => void;
}

/**
 * Connect to the shared realtime socket for the lifetime of the calling
 * component. Connects on mount, releases on unmount, and re-renders when the
 * connection state flips. Reconnection is automatic (handled by Socket.io).
 *
 * Multiple components may call this safely — they share one underlying
 * connection via reference counting in socketClient.ts.
 */
export function useSocket(): UseSocket {
  const socketRef = useRef<ChatSocket | null>(null);
  if (socketRef.current === null) {
    // Grab the singleton for use during render; retain/release happen in the
    // effect so the reference count stays balanced.
    socketRef.current = retainSocket();
    releaseSocket();
  }
  const socket = socketRef.current;
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    retainSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    // Sync in case the socket connected between render and this effect.
    setConnected(socket.connected);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      releaseSocket();
    };
  }, [socket]);

  const emit = useCallback<UseSocket["emit"]>(
    (event, ...args) => {
      // socket.io's typed emit is happy with the spread at the call site.
      (socket.emit as (e: typeof event, ...a: typeof args) => void)(
        event,
        ...args,
      );
    },
    [socket],
  );

  const on = useCallback<UseSocket["on"]>(
    (event, handler) => {
      socket.on(event, handler as never);
    },
    [socket],
  );

  const off = useCallback<UseSocket["off"]>(
    (event, handler) => {
      socket.off(event, handler as never);
    },
    [socket],
  );

  return { socket, connected, emit, on, off };
}
