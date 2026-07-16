"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { DmConversationSummary } from "@/lib/types";
import { presenceRank, usePresence } from "@/lib/usePresence";
import { StatusDot } from "@/components/chat/Avatar";
import { DMListSkeleton } from "@/components/ui/Skeleton";
import { useDMConversations } from "./DMConversationsProvider";

/**
 * Direct-message conversation list for the sidebar. Reads the shared DM store
 * and renders one row per conversation: the other participant's avatar + name,
 * a truncated preview of the last message, and an (placeholder) unread badge.
 * Each row links to `/dm/[id]`.
 */

const PREVIEW_MAX = 50;

function displayName(conversation: DmConversationSummary): string {
  const other = conversation.otherUser;
  return other?.name ?? other?.email ?? "Unknown user";
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "?"
  );
}

/** Truncate a last-message preview to PREVIEW_MAX chars with an ellipsis. */
function preview(conversation: DmConversationSummary): string {
  const body = conversation.lastMessage?.body?.trim();
  if (!body) return "No messages yet";
  return body.length > PREVIEW_MAX
    ? `${body.slice(0, PREVIEW_MAX).trimEnd()}…`
    : body;
}

export function DMList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { conversations, status, reload } = useDMConversations();
  const { getStatus } = usePresence();

  // Sort online users first, then away, then offline. Array.sort is stable, so
  // conversations at the same presence keep the store's recent-activity order.
  const sorted = useMemo(() => {
    const rank = (dm: DmConversationSummary) =>
      dm.otherUser ? presenceRank(getStatus(dm.otherUser.id)) : 3;
    return [...conversations].sort((a, b) => rank(a) - rank(b));
  }, [conversations, getStatus]);

  if (status === "loading") {
    return <DMListSkeleton />;
  }

  if (status === "error") {
    return (
      <div className="px-2 py-1">
        <p className="text-xs text-danger">Couldn&apos;t load DMs.</p>
        <button
          type="button"
          onClick={reload}
          className="mt-1 text-xs font-medium text-accent transition-colors duration-fast hover:text-accent-hover focus:outline-none focus-visible:shadow-focus"
        >
          Retry
        </button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <p className="px-2 py-1 text-xs text-text-muted">
        No conversations yet.
      </p>
    );
  }

  return (
    <ul className="space-y-0.5">
      {sorted.map((dm) => {
        const active = pathname === `/dm/${dm.id}`;
        const name = displayName(dm);
        const other = dm.otherUser;
        return (
          <li key={dm.id}>
            <Link
              href={`/dm/${dm.id}`}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-2 rounded px-2 text-sm transition-colors duration-fast focus:outline-none focus-visible:shadow-focus",
                active
                  ? "bg-accent-muted font-medium text-text"
                  : "text-text-secondary hover:bg-surface-raised hover:text-text",
              )}
            >
              <span className="relative inline-flex shrink-0">
                {other?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={other.image}
                    alt=""
                    className="h-avatar-sm w-avatar-sm rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-avatar-sm w-avatar-sm items-center justify-center rounded-full bg-accent-muted text-[10px] font-semibold text-accent">
                    {initials(name)}
                  </span>
                )}
                {other && (
                  <StatusDot
                    status={getStatus(other.id)}
                    sizeClass="h-2.5 w-2.5"
                  />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate leading-tight">{name}</span>
                <span className="truncate text-xs text-text-muted leading-tight">
                  {preview(dm)}
                </span>
              </span>
              {/* Unread badge — placeholder until unread tracking lands. */}
              <span className="sr-only">unread badge placeholder</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
