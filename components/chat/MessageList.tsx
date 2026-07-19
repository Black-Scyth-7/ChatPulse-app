"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import type { ChatMessage } from "@/lib/useChatMessages";
import { MessageListSkeleton } from "@/components/ui/Skeleton";
import { ChatBubble } from "./ChatBubble";

/** How close to the bottom (px) still counts as "following" the conversation. */
const NEAR_BOTTOM_PX = 120;
/** Distance from the top (px) at which we fetch the next older page. */
const LOAD_OLDER_PX = 80;
/**
 * Max gap between two messages from one author before the visual run breaks
 * (new tail + tighter-vs-looser spacing). WhatsApp groups within ~1 minute.
 */
const GROUP_WINDOW_MS = 60 * 1000;

/** Subtle chat wallpaper: solid WhatsApp canvas with a faint dot texture. */
const WALLPAPER: CSSProperties = {
  backgroundColor: "#0B141A",
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Ccircle cx='20' cy='20' r='1' fill='%23ffffff' fill-opacity='0.02'/%3E%3C/svg%3E\")",
};

function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
}

/** Centered pill badge marking the start of a new day. */
function DateSeparator({ iso }: { iso: string }) {
  return (
    <div className="flex justify-center py-2">
      <span className="rounded-full bg-surface-raised px-3 py-1 text-tick font-medium uppercase tracking-wide text-text-secondary shadow-sm">
        {dayLabel(iso)}
      </span>
    </div>
  );
}

/** Whether a message starts a new visual run (own tail +, in groups, a name). */
function startsGroup(prev: ChatMessage | undefined, cur: ChatMessage): boolean {
  if (!prev) return true;
  if (prev.authorId !== cur.authorId) return true;
  if (!isSameDay(new Date(prev.createdAt), new Date(cur.createdAt))) return true;
  const gap =
    new Date(cur.createdAt).getTime() - new Date(prev.createdAt).getTime();
  return gap > GROUP_WINDOW_MS;
}

/** Number of trailing messages (after `afterId`) authored by someone else. */
function newFromOthers(
  messages: ChatMessage[],
  afterId: string | undefined,
  currentUserId: string,
): number {
  const idx = afterId
    ? messages.findIndex((m) => m.id === afterId)
    : -1;
  const tail = idx === -1 ? messages : messages.slice(idx + 1);
  return tail.filter((m) => m.authorId !== currentUserId).length;
}

export function MessageList({
  messages,
  loading,
  loadingMore,
  hasMore,
  error,
  currentUserId,
  isGroup = false,
  canModify = true,
  onEdit,
  onDelete,
  loadOlder,
  onRetry,
  onRetryMessage,
}: {
  messages: ChatMessage[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  currentUserId: string;
  /** Group chat (channel) — shows sender names on incoming bubbles. */
  isGroup?: boolean;
  /** Whether messages expose edit/delete actions (false for DMs). */
  canModify?: boolean;
  onEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
  loadOlder: () => void;
  /** Retry the initial history load; enables the error-state retry button. */
  onRetry?: () => void;
  /** Re-send a failed optimistic message, keyed by its clientId. */
  onRetryMessage?: (clientId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  // Messages from others that arrived while the user was scrolled up.
  const [unread, setUnread] = useState(0);
  const prevRef = useRef<{
    firstId?: string;
    lastId?: string;
    scrollHeight: number;
    count: number;
  }>({ scrollHeight: 0, count: 0 });

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    atBottomRef.current = true;
    setShowScrollBtn(false);
    setUnread(0);
  }, []);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < NEAR_BOTTOM_PX;
    atBottomRef.current = atBottom;
    setShowScrollBtn(!atBottom);
    if (atBottom) setUnread(0);
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
      } else {
        // Scrolled up: surface the new arrivals from others as unread.
        const added = newFromOthers(messages, prev.lastId, currentUserId);
        if (added > 0) setUnread((n) => n + added);
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
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        onScroll={onScroll}
        style={WALLPAPER}
        className="h-full overflow-y-auto py-3"
      >
        {loadingMore && (
          <p className="py-2 text-center text-tick text-text-secondary">
            Loading earlier messages…
          </p>
        )}
        {!hasMore && messages.length > 0 && (
          <p className="px-4 py-3 text-center text-tick text-text-secondary">
            This is the beginning of the conversation.
          </p>
        )}
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-text-secondary">
            No messages yet — start the conversation!
          </div>
        )}

        {messages.map((msg) => {
          const newDay =
            !prevMsg ||
            !isSameDay(new Date(prevMsg.createdAt), new Date(msg.createdAt));
          const showTail = newDay || startsGroup(prevMsg, msg);
          const node = (
            <div key={msg.id}>
              {newDay && <DateSeparator iso={msg.createdAt} />}
              <ChatBubble
                message={msg}
                isOwn={msg.authorId === currentUserId}
                isGroup={isGroup}
                showTail={showTail}
                canModify={canModify}
                onEdit={onEdit}
                onDelete={onDelete}
                onRetry={onRetryMessage}
              />
            </div>
          );
          prevMsg = msg;
          return node;
        })}
      </div>

      {/* New-messages banner + scroll-to-bottom button, shown when scrolled up. */}
      {showScrollBtn && (
        <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
          {unread > 0 && (
            <button
              type="button"
              onClick={() => scrollToBottom()}
              className="rounded-full bg-surface-overlay px-3 py-1.5 text-tick font-medium text-accent shadow-md transition-colors duration-fast hover:bg-surface-raised focus:outline-none focus-visible:shadow-focus"
            >
              ↓ {unread} new message{unread > 1 ? "s" : ""}
            </button>
          )}
          <button
            type="button"
            aria-label="Scroll to latest messages"
            onClick={() => scrollToBottom()}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface-overlay text-text-secondary shadow-md transition-colors duration-fast hover:bg-surface-raised hover:text-text focus:outline-none focus-visible:shadow-focus"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ↓
            </span>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-unread px-1 text-[11px] font-semibold leading-none text-accent-fg">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
