"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ChannelSummary } from "@/lib/types";
import { useChannels } from "./ChannelsProvider";

/**
 * Scrollable list of the channels the user has joined. Renders each channel as
 * a link to `/channel/[id]`, highlights the active one, and shows an unread
 * badge. Unread counts are placeholder values until real read-state lands.
 */

/**
 * Deterministic placeholder unread count keyed off the channel id, so the list
 * shows a believable mix of read/unread rows without any live data yet.
 * Replace with real per-channel unread state when presence lands.
 */
function placeholderUnread(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const buckets = [0, 0, 0, 3, 7, 12];
  return buckets[hash % buckets.length] ?? 0;
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-xs font-semibold leading-none text-accent-fg">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function ChannelListItem({
  channel,
  active,
  onNavigate,
}: {
  channel: ChannelSummary;
  active: boolean;
  onNavigate?: () => void;
}) {
  const unread = placeholderUnread(channel.id);
  const hasUnread = unread > 0;

  return (
    <Link
      href={`/channel/${channel.id}`}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 items-center gap-2 rounded px-2 text-sm transition-colors duration-fast focus:outline-none focus-visible:shadow-focus",
        active
          ? "bg-accent-muted font-medium text-text"
          : "text-text-secondary hover:bg-surface-raised hover:text-text",
        !active && hasUnread && "font-semibold text-text",
      )}
    >
      <span
        aria-hidden="true"
        className={active ? "text-accent" : "text-text-muted"}
      >
        #
      </span>
      <span className="flex-1 truncate">{channel.name}</span>
      <UnreadBadge count={unread} />
    </Link>
  );
}

export function ChannelList({ onNavigate }: { onNavigate?: () => void }) {
  const { channels, status } = useChannels();
  const pathname = usePathname();

  if (status === "loading") {
    return (
      <p className="px-2 py-1 text-sm text-text-muted">Loading channels…</p>
    );
  }

  if (status === "error") {
    return (
      <p className="px-2 py-1 text-sm text-danger">
        Couldn&apos;t load channels.
      </p>
    );
  }

  if (channels.length === 0) {
    return (
      <p className="px-2 py-1 text-sm text-text-muted">
        No channels yet. Create one to get started.
      </p>
    );
  }

  return (
    <ul className="space-y-0.5">
      {channels.map((channel) => (
        <li key={channel.id}>
          <ChannelListItem
            channel={channel}
            active={pathname === `/channel/${channel.id}`}
            onNavigate={onNavigate}
          />
        </li>
      ))}
    </ul>
  );
}
