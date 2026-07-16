"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MessageWithAuthor, MessagesPage, UserSummary } from "./types";
import type { MessageAck, SerializedMessage } from "./socket-events";
import { useSocket } from "./useSocket";

/** Delivery state of a locally-originated (optimistic) message. */
export type SendStatus = "sending" | "sent" | "failed";

/** A message as held in the client store, with optional optimistic metadata. */
export interface ChatMessage extends MessageWithAuthor {
  /** Set while a locally-sent message is unconfirmed or has failed. */
  status?: SendStatus;
  /** Client-only correlation id for the optimistic placeholder. */
  clientId?: string;
}

export interface UseChatMessages {
  messages: ChatMessage[];
  /** True during the first history fetch for the channel. */
  loading: boolean;
  /** True while an older page is being fetched. */
  loadingMore: boolean;
  /** Whether an older page exists. */
  hasMore: boolean;
  /** Non-null when history could not be loaded. */
  error: string | null;
  /** Whether the realtime socket is connected. */
  connected: boolean;
  /** Re-run the initial history load (used by the error-state retry button). */
  reload: () => void;
  /** Fetch the next older page and prepend it. */
  loadOlder: () => void;
  /** Optimistically send a message over the socket. */
  sendMessage: (body: string) => void;
  /** Edit one of the current user's messages. */
  editMessage: (id: string, body: string) => void;
  /** Delete one of the current user's messages. */
  deleteMessage: (id: string) => void;
}

const PAGE_SIZE = 50;

/** Normalize a realtime SerializedMessage into the store's message shape. */
function fromSerialized(m: SerializedMessage): ChatMessage {
  return {
    id: m.id,
    channelId: m.channelId,
    authorId: m.author.id,
    body: m.body,
    editedAt: m.editedAt,
    createdAt: m.createdAt,
    author: {
      id: m.author.id,
      name: m.author.name,
      email: null,
      image: m.author.image,
    },
  };
}

/** Insert/replace a message keeping the list sorted oldest→newest by time. */
function upsertSorted(list: ChatMessage[], msg: ChatMessage): ChatMessage[] {
  const without = list.filter((m) => m.id !== msg.id);
  const idx = without.findIndex(
    (m) => new Date(m.createdAt).getTime() > new Date(msg.createdAt).getTime(),
  );
  if (idx === -1) return [...without, msg];
  return [...without.slice(0, idx), msg, ...without.slice(idx)];
}

/**
 * Manage the message store for a single channel: initial history load, cursor
 * pagination for older messages, live socket subscriptions, and optimistic
 * send/edit/delete. Returns everything the chat view needs to render.
 */
export function useChatMessages(
  channelId: string,
  currentUser: UserSummary,
): UseChatMessages {
  const { emit, on, off, connected } = useSocket();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  // Bump to force the initial-load effect to re-run (retry after an error).
  const [reloadNonce, setReloadNonce] = useState(0);
  const reload = useCallback(() => setReloadNonce((n) => n + 1), []);

  // --- Initial history load (and reset when the channel changes) -----------
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setMessages([]);
    cursorRef.current = null;
    setHasMore(false);

    (async () => {
      try {
        const res = await fetch(
          `/api/channels/${channelId}/messages?limit=${PAGE_SIZE}`,
        );
        if (!res.ok) throw new Error(`Failed to load messages (${res.status})`);
        const data: MessagesPage = await res.json();
        if (cancelled) return;
        // API returns newest-first; the store keeps oldest→newest for display.
        setMessages([...data.messages].reverse());
        cursorRef.current = data.nextCursor;
        setHasMore(data.nextCursor !== null);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load messages");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [channelId, reloadNonce]);

  // --- Live socket subscriptions -------------------------------------------
  useEffect(() => {
    const onNew = (data: SerializedMessage) => {
      if (data.channelId !== channelId) return;
      const incoming = fromSerialized(data);
      setMessages((prev) => {
        // Reconcile with a pending optimistic message from this user: match the
        // oldest still-sending placeholder with the same body and adopt the
        // server id, so the echo of our own send doesn't duplicate.
        if (incoming.authorId === currentUser.id) {
          const pendingIdx = prev.findIndex(
            (m) =>
              m.status === "sending" &&
              m.clientId &&
              m.body === incoming.body,
          );
          if (pendingIdx !== -1) {
            const next = [...prev];
            next[pendingIdx] = { ...incoming, status: "sent" };
            return next;
          }
        }
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return upsertSorted(prev, incoming);
      });
    };

    const onUpdated = (data: SerializedMessage) => {
      if (data.channelId !== channelId) return;
      const updated = fromSerialized(data);
      setMessages((prev) =>
        prev.map((m) => (m.id === updated.id ? { ...updated } : m)),
      );
    };

    const onDeleted = (data: { id: string; channelId: string }) => {
      if (data.channelId !== channelId) return;
      setMessages((prev) => prev.filter((m) => m.id !== data.id));
    };

    on("message:new", onNew);
    on("message:updated", onUpdated);
    on("message:deleted", onDeleted);
    return () => {
      off("message:new", onNew);
      off("message:updated", onUpdated);
      off("message:deleted", onDeleted);
    };
  }, [channelId, currentUser.id, on, off]);

  // --- Pagination ----------------------------------------------------------
  const loadOlder = useCallback(() => {
    const cursor = cursorRef.current;
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/channels/${channelId}/messages?limit=${PAGE_SIZE}&cursor=${encodeURIComponent(cursor)}`,
        );
        if (!res.ok) throw new Error(`Failed to load messages (${res.status})`);
        const data: MessagesPage = await res.json();
        // Older page is also newest-first; reverse and prepend.
        const older = [...data.messages].reverse();
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...older.filter((m) => !seen.has(m.id)), ...prev];
        });
        cursorRef.current = data.nextCursor;
        setHasMore(data.nextCursor !== null);
      } catch {
        // Leave hasMore as-is so the user can retry by scrolling again.
      } finally {
        setLoadingMore(false);
      }
    })();
  }, [channelId, loadingMore]);

  // --- Optimistic send -----------------------------------------------------
  const sendMessage = useCallback(
    (raw: string) => {
      const body = raw.trim();
      if (!body) return;
      const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic: ChatMessage = {
        id: clientId,
        clientId,
        channelId,
        authorId: currentUser.id,
        body,
        editedAt: null,
        createdAt: new Date().toISOString(),
        author: currentUser,
        status: "sending",
      };
      setMessages((prev) => [...prev, optimistic]);

      emit("message:send", { channelId, body }, (res: MessageAck) => {
        if (res.ok && res.message) {
          const confirmed = fromSerialized(res.message);
          setMessages((prev) => {
            // If the broadcast already reconciled this placeholder, don't
            // re-add it; otherwise swap the placeholder for the real message.
            const stillPending = prev.some((m) => m.clientId === clientId);
            if (!stillPending) return prev;
            return prev.map((m) =>
              m.clientId === clientId
                ? { ...confirmed, status: "sent" }
                : m,
            );
          });
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.clientId === clientId ? { ...m, status: "failed" } : m,
            ),
          );
        }
      });
    },
    [channelId, currentUser, emit],
  );

  const editMessage = useCallback(
    (id: string, raw: string) => {
      const body = raw.trim();
      if (!body) return;
      // Optimistically reflect the edit; the message:updated echo confirms it.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, body, editedAt: new Date().toISOString() }
            : m,
        ),
      );
      emit("message:edit", { messageId: id, body });
    },
    [emit],
  );

  const deleteMessage = useCallback(
    (id: string) => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      emit("message:delete", { messageId: id });
    },
    [emit],
  );

  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    error,
    connected,
    reload,
    loadOlder,
    sendMessage,
    editMessage,
    deleteMessage,
  };
}
