"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import type { PresenceStatus } from "@/lib/socket-events";
import { useSocket } from "@/lib/useSocket";
import { PRESENCE_DOT, PRESENCE_LABEL } from "@/lib/usePresence";
import {
  NOTIFICATION_MODES,
  NOTIFICATION_MODE_LABEL,
} from "@/lib/notifications";
import { useNotificationSettings } from "@/lib/useNotificationSettings";
import { CreateChannelModal } from "@/components/sidebar/CreateChannelModal";
import { UserPicker } from "@/components/sidebar/UserPicker";
import { ConversationListSkeleton } from "@/components/ui/Skeleton";
import { useConversations } from "./ConversationsProvider";
import { ConversationItem } from "./ConversationItem";

/**
 * The WhatsApp-style left panel: a top bar (user avatar + presence, app name,
 * search, overflow menu), a search field that filters the list by conversation
 * name, and the scrollable unified list of channels and DMs.
 *
 * The caller supplies a width/visibility class (30% desktop; full-screen on
 * mobile, hidden when a chat is open). `onNavigate` fires when a row is clicked.
 */

export interface ConversationListUser {
  name: string | null;
  email: string | null;
  image: string | null;
}

const STATUS_ORDER: PresenceStatus[] = ["online", "away", "offline"];

function initials(user: ConversationListUser): string {
  const source = user.name ?? user.email ?? "?";
  return (
    source
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "?"
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}

/** User avatar + presence-status dropdown (online / away / offline). */
function UserAvatarMenu({ user }: { user: ConversationListUser }) {
  const { emit } = useSocket();
  const [status, setStatus] = useState<PresenceStatus>("online");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectStatus = (next: PresenceStatus) => {
    setStatus(next);
    setOpen(false);
    emit("presence:update", { status: next });
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`You — ${PRESENCE_LABEL[status]}`}
        className="relative flex rounded-full focus:outline-none focus-visible:shadow-focus"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="h-avatar w-avatar rounded-full object-cover" />
        ) : (
          <span className="flex h-avatar w-avatar items-center justify-center rounded-full bg-accent-muted text-sm font-semibold text-accent">
            {initials(user)}
          </span>
        )}
        <span
          aria-hidden="true"
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-header",
            PRESENCE_DOT[status],
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-dropdown mt-2 min-w-44 rounded-md border border-border bg-surface-overlay py-1 shadow-md"
        >
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              role="menuitemradio"
              aria-checked={s === status}
              onClick={() => selectStatus(s)}
              className="flex h-9 w-full items-center gap-2 px-3 text-sm text-text transition-colors duration-fast hover:bg-surface-raised focus:outline-none focus-visible:bg-surface-raised"
            >
              <span className={cn("h-2 w-2 rounded-full", PRESENCE_DOT[s])} />
              <span className="flex-1 text-left">{PRESENCE_LABEL[s]}</span>
              {s === status && <span className="text-accent" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Overflow (three-dots) menu: New direct message, New group, Sign out. */
function OverflowMenu({
  onNewDm,
  onNewGroup,
}: {
  onNewDm: () => void;
  onNewGroup: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { mode, setMode } = useNotificationSettings();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const item =
    "flex h-9 w-full items-center px-3 text-sm text-text transition-colors duration-fast hover:bg-surface-raised focus:outline-none focus-visible:bg-surface-raised";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu"
        className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors duration-fast hover:bg-surface-raised hover:text-text focus:outline-none focus-visible:shadow-focus"
      >
        <MenuIcon />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-dropdown mt-2 min-w-48 rounded-md border border-border bg-surface-overlay py-1 shadow-md"
        >
          <button type="button" role="menuitem" className={item} onClick={() => { setOpen(false); onNewDm(); }}>
            New direct message
          </button>
          <button type="button" role="menuitem" className={item} onClick={() => { setOpen(false); onNewGroup(); }}>
            New group
          </button>
          <div className="my-1 h-px bg-border" role="separator" />
          <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Notifications
          </div>
          {NOTIFICATION_MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="menuitemradio"
              aria-checked={m === mode}
              className={item}
              onClick={() => setMode(m)}
            >
              <span className="flex-1 text-left">{NOTIFICATION_MODE_LABEL[m]}</span>
              {m === mode && <span className="text-accent" aria-hidden="true">✓</span>}
            </button>
          ))}
          <div className="my-1 h-px bg-border" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="flex h-9 w-full items-center px-3 text-sm text-danger transition-colors duration-fast hover:bg-surface-raised focus:outline-none focus-visible:bg-surface-raised"
            onClick={() => { setOpen(false); void signOut({ callbackUrl: "/login" }); }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function ConversationList({
  user,
  className,
  onNavigate,
}: {
  user: ConversationListUser;
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { conversations, status, reload } = useConversations();
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [dmPickerOpen, setDmPickerOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.name.toLowerCase().includes(q));
  }, [conversations, query]);

  return (
    <aside
      className={cn(
        "h-full min-w-0 shrink-0 flex-col border-r border-border bg-panel",
        className,
      )}
    >
      {/* Top bar */}
      <header className="flex h-topbar shrink-0 items-center gap-3 bg-header px-4">
        <UserAvatarMenu user={user} />
        <span className="flex-1 truncate text-title font-semibold text-text">
          ChatPulse
        </span>
        <button
          type="button"
          onClick={() => searchRef.current?.focus()}
          aria-label="Search conversations"
          className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors duration-fast hover:bg-surface-raised hover:text-text focus:outline-none focus-visible:shadow-focus"
        >
          <SearchIcon />
        </button>
        <OverflowMenu
          onNewDm={() => setDmPickerOpen(true)}
          onNewGroup={() => setCreateOpen(true)}
        />
      </header>

      {/* Search bar */}
      <div className="shrink-0 px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-surface-inset px-3">
          <span className="text-text-muted">
            <SearchIcon />
          </span>
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="h-9 min-w-0 flex-1 bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-text-muted transition-colors duration-fast hover:text-text focus:outline-none"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {status === "loading" ? (
          <ConversationListSkeleton />
        ) : status === "error" ? (
          <div className="px-4 py-3">
            <p className="text-sm text-danger">Couldn&apos;t load conversations.</p>
            <button
              type="button"
              onClick={reload}
              className="mt-1 text-sm font-medium text-accent transition-colors duration-fast hover:text-accent-hover focus:outline-none focus-visible:shadow-focus"
            >
              Retry
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-4 py-3 text-sm text-text-muted">
            No conversations yet. Start a chat or create a group.
          </p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-3 text-sm text-text-muted">
            No conversations match &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {filtered.map((item) => (
              <li key={`${item.type}:${item.id}`}>
                <ConversationItem
                  item={item}
                  active={
                    pathname ===
                    (item.type === "channel"
                      ? `/channel/${item.id}`
                      : `/dm/${item.id}`)
                  }
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <CreateChannelModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <UserPicker open={dmPickerOpen} onClose={() => setDmPickerOpen(false)} />
    </aside>
  );
}
