"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import type { ChatMessage } from "@/lib/useChatMessages";
import { MessageItem } from "./MessageItem";

/** How close to the bottom (px) still counts as "following" the conversation. */
const NEAR_BOTTOM_PX = 120;
/** Distance from the top (px) at which we fetch the next older page. */
const LOAD_OLDER_PX = 80;
/** Max gap between two messages from one author before we break the group. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
}

function DateSeparator({ iso }: { iso: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <span className="h-px flex-1 bg-border" />
      <span className="shrink-0 text-xs font-medium text-text-muted">
        {dayLabel(iso)}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/** Decide whether a message starts a new visual group (shows its own header). */
function startsGroup(prev: ChatMessage | undefined, cur: ChatMessage): boolean {
  if (!prev) return true;
  if (prev.authorId !== cur.authorId) return true;
  if (!isSameDay(new Date(prev.createdAt), new Date(cur.createdAt))) return true;
  const gap =
    new Date(cur.createdAt).getTime() - new Date(prev.createdAt).getTime();
  return gap > GROUP_WINDOW_MS;
}

export function MessageList({
  messages,
  loading,
  loadingMore,
  hasMore,
  error,
  currentUserId,
  onEdit,
  onDelete,
  loadOlder,
}: {
  messages: ChatMessage[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  currentUserId: string;
  onEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
  loadOlder: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const prevRef = useRef<{
    firstId?: string;
    lastId?: string;
    scrollHeight: number;
    count: number;
  }>({ scrollHeight: 0, count: 0 });

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottomRef.current = distanceFromBottom < NEAR_BOTTOM_PX;
    if (el.scrollTop < LOAD_OLDER_PX && hasMore && !loadingMore) {
      loadOlder();
    }
  }, [hasMore, loadingMore, loadOlder]);

  // Manage scroll position across loads: jump to bottom on first load, keep the
  // viewport stable when older messages are prepended, and follow new messages
  // only when the user is already at the bottom (or sent the message).
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const first = messages[0]?.id;
    const last = messages[messages.length - 1]?.id;
    const prev = prevRef.current;

    if (prev.count === 0 && messages.length > 0) {
      el.scrollTop = el.scrollHeight;
    } else if (first !== prev.firstId && last === prev.lastId) {
      // Older page prepended above the current view.
      el.scrollTop = el.scrollTop + (el.scrollHeight - prev.scrollHeight);
    } else if (last !== prev.lastId && messages.length > prev.count) {
      const lastMsg = messages[messages.length - 1];
      if (atBottomRef.current || lastMsg?.authorId === currentUserId) {
        el.scrollTop = el.scrollHeight;
      }
    }

    prevRef.current = {
      firstId: first,
      lastId: last,
      scrollHeight: el.scrollHeight,
      count: messages.length,
    };
  }, [messages, currentUserId]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
        Loading messages…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-danger">
        {error}
      </div>
    );
  }

  let prevMsg: ChatMessage | undefined;

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto py-3"
    >
      {loadingMore && (
        <p className="py-2 text-center text-xs text-text-muted">
          Loading earlier messages…
        </p>
      )}
      {!hasMore && messages.length > 0 && (
        <p className="px-4 py-3 text-center text-xs text-text-muted">
          This is the beginning of the conversation.
        </p>
      )}
      {messages.length === 0 && (
        <div className="flex h-full items-center justify-center text-sm text-text-muted">
          No messages yet. Say hello!
        </div>
      )}

      {messages.map((msg) => {
        const newDay =
          !prevMsg ||
          !isSameDay(new Date(prevMsg.createdAt), new Date(msg.createdAt));
        const showHeader = newDay || startsGroup(prevMsg, msg);
        const node = (
          <div key={msg.id}>
            {newDay && <DateSeparator iso={msg.createdAt} />}
            <MessageItem
              message={msg}
              showHeader={showHeader}
              isOwn={msg.authorId === currentUserId}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        );
        prevMsg = msg;
        return node;
      })}
    </div>
  );
}
