"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import type { ChatMessage } from "@/lib/useChatMessages";
import { MessageListSkeleton } from "@/components/ui/Skeleton";
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
  canModify = true,
  onEdit,
  onDelete,
  loadOlder,
  onRetry,
}: {
  messages: ChatMessage[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  currentUserId: string;
  /** Whether messages expose edit/delete actions (false for DMs). */
  canModify?: boolean;
  onEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
  loadOlder: () => void;
  /** Retry the initial history load; enables the error-state retry button. */
  onRetry?: () => void;
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
      // First load: jump to the latest message instantly (no animation).
      el.scrollTop = el.scrollHeight;
    } else if (first !== prev.firstId && last === prev.lastId) {
      // Older page prepended above the current view — hold position, no anim.
      el.scrollTop = el.scrollTop + (el.scrollHeight - prev.scrollHeight);
    } else if (last !== prev.lastId && messages.length > prev.count) {
      const lastMsg = messages[messages.length - 1];
      if (atBottomRef.current || lastMsg?.authorId === currentUserId) {
        // Smoothly follow a newly arrived/sent message into view.
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
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
    return <MessageListSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-danger">
          Failed to load messages.
          {onRetry ? " Retry?" : ""}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-8 items-center rounded border border-border bg-surface-raised px-3 text-sm font-medium text-text transition-colors duration-fast hover:bg-surface-overlay focus:outline-none focus-visible:shadow-focus"
          >
            Retry
          </button>
        )}
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
        <div className="flex h-full items-center justify-center px-4 text-center text-sm text-text-muted">
          No messages yet — start the conversation!
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
              canModify={canModify}
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
