"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ConversationListItem } from "@/lib/types";
import { usePresence } from "@/lib/usePresence";

/**
 * A single row in the WhatsApp-style conversation list: avatar (with a presence
 * dot for DMs or a colored monogram for channels), name + last-message preview,
 * and a right column with the timestamp and unread badge. The whole row links to
 * the conversation's chat view.
 *
 * Unread rows read louder: bold name, green (accent) timestamp, and a green
 * count badge.
 */

/** Deterministic background hue for a channel monogram, keyed off its name. */
const MONOGRAM_COLORS = [
  "bg-[#6B4FBB]",
  "bg-[#0EA5A0]",
  "bg-[#C2557A]",
  "bg-[#4F86C6]",
  "bg-[#B4884D]",
  "bg-[#5FA052]",
];

function monogramColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return MONOGRAM_COLORS[Math.abs(hash) % MONOGRAM_COLORS.length]!;
}

/** First letter of a name (uppercased), for channel monograms / DM fallbacks. */
function firstLetter(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? "#";
}

/**
 * WhatsApp-style relative timestamp: time for today, "Yesterday", weekday within
 * the last week, else a short date. Guards against an unparseable value.
 */
function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const dayMs = 86_400_000;
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const daysAgo = Math.round((startOfToday - startOfDate) / dayMs);

  if (daysAgo <= 0) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo < 7) {
    return date.toLocaleDateString(undefined, { weekday: "long" });
  }
  return date.toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });
}

/**
 * Compose the preview line: "You: …" for the user's own messages, "Alice: …" for
 * others in a channel, and just the message for DMs.
 */
function previewText(item: ConversationListItem): string {
  const last = item.lastMessage;
  if (!last) return "No messages yet";
  if (last.isOwn) return `You: ${last.content}`;
  if (item.type === "channel") return `${last.senderName}: ${last.content}`;
  return last.content;
}

function Avatar({ item, online }: { item: ConversationListItem; online: boolean }) {
  const isChannel = item.type === "channel";
  return (
    <span className="relative inline-flex shrink-0">
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image}
          alt=""
          className="h-12 w-12 rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold text-white",
            isChannel ? monogramColor(item.name) : "bg-accent-muted text-accent",
          )}
        >
          {firstLetter(item.name)}
        </span>
      )}
      {/* Online dot: DMs only. */}
      {item.type === "dm" && online && (
        <span
          role="img"
          aria-label="Online"
          className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-success ring-2 ring-panel"
        />
      )}
    </span>
  );
}

export function ConversationItem({
  item,
  active,
  onNavigate,
}: {
  item: ConversationListItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const { getStatus } = usePresence();
  // Prefer the live presence store for DMs; fall back to the fetch-time snapshot.
  const online =
    item.type === "dm"
      ? item.otherUserId
        ? getStatus(item.otherUserId) !== "offline"
        : Boolean(item.isOnline)
      : false;

  const hasUnread = item.unreadCount > 0;
  const href = item.type === "channel" ? `/channel/${item.id}` : `/dm/${item.id}`;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 transition-colors duration-fast focus:outline-none focus-visible:bg-surface-raised",
        active ? "bg-surface-raised" : "hover:bg-surface-raised",
      )}
    >
      <Avatar item={item} online={online} />

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-name leading-tight",
              hasUnread ? "font-semibold text-text" : "font-normal text-text",
            )}
          >
            {item.name}
          </span>
          {item.lastMessage && (
            <span
              className={cn(
                "shrink-0 text-tick",
                hasUnread ? "font-semibold text-accent" : "text-text-secondary",
              )}
            >
              {formatTimestamp(item.lastMessage.timestamp)}
            </span>
          )}
        </span>

        <span className="flex items-center gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-preview",
              hasUnread ? "text-text-secondary" : "text-text-muted",
            )}
          >
            {previewText(item)}
          </span>
          {hasUnread && (
            <span
              aria-label={`${item.unreadCount} unread`}
              className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-unread px-1.5 text-tick font-semibold leading-none text-accent-fg"
            >
              {item.unreadCount > 99 ? "99+" : item.unreadCount}
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}
