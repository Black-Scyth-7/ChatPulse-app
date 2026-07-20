"use client";

import { apiUrl } from "@/lib/apiBase";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DirectMessageWithAuthor,
  DirectMessagesPage,
  UserSummary,
} from "./types";
import type { DirectMessageAck, SerializedDirectMessage } from "./socket-events";
import type { ChatMessage } from "./useChatMessages";
import { useSocket } from "./useSocket";

export interface UseDirectMessages {
  messages: ChatMessage[];
  /** True during the first history fetch for the conversation. */
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
  /** Optimistically send a direct message over the socket. */
  sendMessage: (body: string) => void;
  /** Re-send a failed optimistic message, keyed by its clientId. */
  retryMessage: (clientId: string) => void;
}

const PAGE_SIZE = 50;

/**
 * Map a DM (from history or the wire) into the shared ChatMessage shape used by
 * MessageList/MessageItem. The conversation id rides in `channelId` since those
 * components only read author/body/timestamps for rendering.
 */
function toChatMessage(
  m: DirectMessageWithAuthor | SerializedDirectMessage,
): ChatMessage {
  const author =
    "email" in m.author
      ? m.author
      : { ...m.author, email: null };
  return {
    id: m.id,
    channelId: m.conversationId,
    authorId: author.id,
    body: m.body,
    editedAt: m.editedAt,
    createdAt: m.createdAt,
    status: m.status,
    author: {
      id: author.id,
      name: author.name,
      email: author.email ?? null,
      image: author.image,
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
 * Manage the message store for a single DM conversation: initial history load,
 * cursor pagination for older messages, live `dm:new` subscription, and
 * optimistic send via `dm:send`. Mirrors `useChatMessages` for channels, minus
 * edit/delete (the DM realtime contract only carries send + new).
 */
export function useDirectMessages(
  conversationId: string,
  currentUser: UserSummary,
): UseDirectMessages {
  const { emit, on, off, connected } = useSocket();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Mirror of `messages` for reading the latest state inside stable callbacks
  // (e.g. retry) without adding `messages` to their dependency lists.
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  // Bump to force the initial-load effect to re-run (retry after an error).
  const [reloadNonce, setReloadNonce] = useState(0);
  const reload = useCallback(() => setReloadNonce((n) => n + 1), []);

  // --- Initial history load (and reset when the conversation changes) -------
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
          apiUrl(`/api/dm/${conversationId}/messages?limit=${PAGE_SIZE}`),
        );
        if (!res.ok) throw new Error(`Failed to load messages (${res.status})`);
        const data: DirectMessagesPage = await res.json();
        if (cancelled) return;
        // API returns newest-first; the store keeps oldest→newest for display.
        setMessages([...data.messages].reverse().map(toChatMessage));
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
  }, [conversationId, reloadNonce]);

  // --- Live socket subscription --------------------------------------------
  useEffect(() => {
    const onNew = (data: SerializedDirectMessage) => {
      if (data.conversationId !== conversationId) return;
      const incoming = toChatMessage(data);
      setMessages((prev) => {
        // Reconcile with a pending optimistic message from this user: match the
        // oldest still-sending placeholder with the same body and adopt the
        // server id, so the echo of our own send doesn't duplicate.
        if (incoming.authorId === currentUser.id) {
          const pendingIdx = prev.findIndex(
            (m) =>
              m.sendState === "sending" &&
              m.clientId &&
              m.body === incoming.body,
          );
          if (pendingIdx !== -1) {
            const next = [...prev];
            next[pendingIdx] = { ...incoming, sendState: "sent" };
            return next;
          }
        }
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return upsertSorted(prev, incoming);
      });
    };

    on("dm:new", onNew);
    return () => {
      off("dm:new", onNew);
    };
  }, [conversationId, currentUser.id, on, off]);

  // --- Pagination ----------------------------------------------------------
  const loadOlder = useCallback(() => {
    const cursor = cursorRef.current;
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    (async () => {
      try {
        const res = await fetch(
          apiUrl(`/api/dm/${conversationId}/messages?limit=${PAGE_SIZE}&cursor=${encodeURIComponent(cursor)}`),
        );
        if (!res.ok) throw new Error(`Failed to load messages (${res.status})`);
        const data: DirectMessagesPage = await res.json();
        // Older page is also newest-first; reverse and prepend.
        const older = [...data.messages].reverse().map(toChatMessage);
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
  }, [conversationId, loadingMore]);

  // --- Optimistic send -----------------------------------------------------
  // Emit the socket send for a placeholder identified by clientId and reconcile
  // the ack: adopt the server message on success, flip to "failed" otherwise.
  // Shared by the initial send and retry so both reconcile identically.
  const dispatchSend = useCallback(
    (clientId: string, body: string) => {
      emit(
        "dm:send",
        { conversationId, content: body },
        (res: DirectMessageAck) => {
          if (res.ok && res.message) {
            const confirmed = toChatMessage(res.message);
            setMessages((prev) => {
              // If the broadcast already reconciled this placeholder, don't
              // re-add it; otherwise swap the placeholder for the real message.
              const stillPending = prev.some((m) => m.clientId === clientId);
              if (!stillPending) return prev;
              return prev.map((m) =>
                m.clientId === clientId
                  ? { ...confirmed, sendState: "sent" }
                  : m,
              );
            });
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.clientId === clientId ? { ...m, sendState: "failed" } : m,
              ),
            );
          }
        },
      );
    },
    [conversationId, emit],
  );

  const sendMessage = useCallback(
    (raw: string) => {
      const body = raw.trim();
      if (!body) return;
      const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic: ChatMessage = {
        id: clientId,
        clientId,
        channelId: conversationId,
        authorId: currentUser.id,
        body,
        editedAt: null,
        createdAt: new Date().toISOString(),
        author: currentUser,
        // Server delivery state defaults to SENT; sendState drives the
        // optimistic pending/failed UI until the ack lands.
        status: "SENT",
        sendState: "sending",
      };
      setMessages((prev) => [...prev, optimistic]);
      dispatchSend(clientId, body);
    },
    [conversationId, currentUser, dispatchSend],
  );

  const retryMessage = useCallback(
    (clientId: string) => {
      // Flip the failed placeholder back to "sending" and re-emit its body.
      const target = messagesRef.current.find(
        (m) => m.clientId === clientId && m.sendState === "failed",
      );
      if (!target) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.clientId === clientId ? { ...m, sendState: "sending" } : m,
        ),
      );
      dispatchSend(clientId, target.body);
    },
    [dispatchSend],
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
    retryMessage,
  };
}
