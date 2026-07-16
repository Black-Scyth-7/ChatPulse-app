"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { DmConversationSummary } from "@/lib/types";
import type { SerializedDirectMessage } from "@/lib/socket-events";
import { useSocket } from "@/lib/useSocket";

/**
 * Client-side store for the current user's DM conversations. Fetched once from
 * `GET /api/dm` and shared by every sidebar surface (desktop aside + mobile
 * drawer) plus the DM chat header, so we don't fetch the list repeatedly.
 *
 * A live `dm:new` subscription keeps the list fresh: each incoming message
 * updates its conversation's last-message preview and re-sorts the list so the
 * most recently active conversation floats to the top.
 */

type LoadStatus = "loading" | "ready" | "error";

interface DMConversationsContextValue {
  conversations: DmConversationSummary[];
  status: LoadStatus;
  /** Insert or replace a conversation, then re-sort by most-recent activity. */
  upsertConversation: (conversation: DmConversationSummary) => void;
  /** Look up a conversation by id (undefined if not loaded). */
  getConversation: (id: string) => DmConversationSummary | undefined;
  /** Refetch the conversation list (used by the error-state retry button). */
  reload: () => void;
}

const DMConversationsContext =
  createContext<DMConversationsContextValue | null>(null);

/** Sort conversations newest-activity first (descending updatedAt). */
function sortByActivity(
  list: DmConversationSummary[],
): DmConversationSummary[] {
  return [...list].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function DMConversationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { on, off } = useSocket();
  const [conversations, setConversations] = useState<DmConversationSummary[]>(
    [],
  );
  const [status, setStatus] = useState<LoadStatus>("loading");
  // Bump to force the conversation-list fetch to re-run (retry after an error).
  const [reloadNonce, setReloadNonce] = useState(0);
  const reload = useCallback(() => {
    setStatus("loading");
    setReloadNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dm");
        if (!res.ok) throw new Error(`Failed to load DMs (${res.status})`);
        const data: { conversations?: DmConversationSummary[] } =
          await res.json();
        if (cancelled) return;
        setConversations(sortByActivity(data.conversations ?? []));
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadNonce]);

  const upsertConversation = useCallback(
    (conversation: DmConversationSummary) => {
      setConversations((prev) => {
        const others = prev.filter((c) => c.id !== conversation.id);
        // Preserve the existing last-message preview if the incoming record
        // doesn't carry one (e.g. the POST /api/dm "existing" response).
        const existing = prev.find((c) => c.id === conversation.id);
        const merged: DmConversationSummary = {
          ...conversation,
          lastMessage: conversation.lastMessage ?? existing?.lastMessage ?? null,
        };
        return sortByActivity([merged, ...others]);
      });
    },
    [],
  );

  const getConversation = useCallback(
    (id: string) => conversations.find((c) => c.id === id),
    [conversations],
  );

  // Live preview updates: fold each incoming DM into its conversation.
  useEffect(() => {
    const onDmNew = (msg: SerializedDirectMessage) => {
      setConversations((prev) => {
        const existing = prev.find((c) => c.id === msg.conversationId);
        if (!existing) return prev; // conversation not in this user's list
        const updated: DmConversationSummary = {
          ...existing,
          lastMessage: {
            id: msg.id,
            authorId: msg.author.id,
            body: msg.body,
            createdAt: msg.createdAt,
          },
          updatedAt: msg.createdAt,
        };
        return sortByActivity([
          updated,
          ...prev.filter((c) => c.id !== msg.conversationId),
        ]);
      });
    };
    on("dm:new", onDmNew);
    return () => {
      off("dm:new", onDmNew);
    };
  }, [on, off]);

  return (
    <DMConversationsContext.Provider
      value={{ conversations, status, upsertConversation, getConversation, reload }}
    >
      {children}
    </DMConversationsContext.Provider>
  );
}

export function useDMConversations(): DMConversationsContextValue {
  const ctx = useContext(DMConversationsContext);
  if (!ctx) {
    throw new Error(
      "useDMConversations must be used within a <DMConversationsProvider>",
    );
  }
  return ctx;
}
