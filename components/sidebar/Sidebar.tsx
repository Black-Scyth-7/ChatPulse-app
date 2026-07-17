"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import type { PresenceStatus } from "@/lib/socket-events";
import { useSocket } from "@/lib/useSocket";
import { PRESENCE_DOT, PRESENCE_LABEL } from "@/lib/usePresence";
import { useChannels } from "./ChannelsProvider";
import { ChannelList } from "./ChannelList";
import { DMList } from "./DMList";
import { CreateChannelModal } from "./CreateChannelModal";
import { UserPicker } from "./UserPicker";

/**
 * Full channel sidebar: user section at top, a scrollable body with the
 * Channels and Direct Messages sections, and the create-channel modal.
 *
 * The caller supplies a display class (`hidden md:flex` for the desktop aside,
 * `flex` inside the mobile drawer). `onNavigate` fires when a list item is
 * clicked, letting the mobile drawer close itself.
 */

export interface SidebarUser {
  name: string | null;
  email: string | null;
  image: string | null;
}

// The self-status selector offers exactly the states the presence system
// supports (online/away/offline); "offline" is an explicit "appear offline".
const STATUS_ORDER: PresenceStatus[] = ["online", "away", "offline"];

function initials(user: SidebarUser): string {
  const source = user.name ?? user.email ?? "?";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function UserSection({ user }: { user: SidebarUser }) {
  const { emit } = useSocket();
  const [status, setStatus] = useState<PresenceStatus>("online");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Optimistically reflect the pick locally and broadcast it so everyone else's
  // presence dot for us updates (the server persists it and re-emits
  // presence:changed to all clients).
  const selectStatus = (next: PresenceStatus) => {
    setStatus(next);
    setOpen(false);
    emit("presence:update", { status: next });
  };

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative flex h-topbar shrink-0 items-center gap-2 border-b border-border px-3"
    >
      <span className="relative shrink-0">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            className="h-avatar w-avatar rounded-full object-cover"
          />
        ) : (
          <span className="flex h-avatar w-avatar items-center justify-center rounded-full bg-accent-muted text-sm font-semibold text-accent">
            {initials(user)}
          </span>
        )}
        <span
          aria-hidden="true"
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-surface",
            PRESENCE_DOT[status],
          )}
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text">
          {user.name ?? user.email ?? "You"}
        </p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-1 text-xs text-text-secondary transition-colors duration-fast hover:text-text focus:outline-none focus-visible:shadow-focus"
        >
          <span className={cn("h-2 w-2 rounded-full", PRESENCE_DOT[status])} />
          <span className="truncate">{PRESENCE_LABEL[status]}</span>
          <span aria-hidden="true">▾</span>
        </button>
      </div>

      {open && (
        <div
          role="menu"
          className="absolute left-3 top-full z-dropdown mt-1 min-w-44 rounded-md border border-border bg-surface-overlay py-1 shadow-md"
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
              {s === status && (
                <span className="text-accent" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}

          <div className="my-1 h-px bg-border" role="separator" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut({ callbackUrl: "/login" });
            }}
            className="flex h-9 w-full items-center gap-2 px-3 text-sm text-danger transition-colors duration-fast hover:bg-surface-raised focus:outline-none focus-visible:bg-surface-raised"
          >
            <span className="flex-1 text-left">Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}

function SectionHeading({
  label,
  onAdd,
  addLabel,
  badge,
}: {
  label: string;
  onAdd: () => void;
  addLabel: string;
  /** Optional unread total shown beside the label. */
  badge?: number;
}) {
  return (
    <div className="flex items-center justify-between px-2 pb-1 pt-4">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
        {label}
        {badge != null && badge > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-accent-fg">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={onAdd}
        aria-label={addLabel}
        title={addLabel}
        className="flex h-5 w-5 items-center justify-center rounded text-text-muted transition-colors duration-fast hover:bg-surface-raised hover:text-text focus:outline-none focus-visible:shadow-focus"
      >
        <span aria-hidden="true" className="text-base leading-none">
          +
        </span>
      </button>
    </div>
  );
}

export function Sidebar({
  user,
  className,
  onNavigate,
}: {
  user: SidebarUser;
  className?: string;
  onNavigate?: () => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [dmPickerOpen, setDmPickerOpen] = useState(false);
  const { totalUnread } = useChannels();

  return (
    <aside
      className={cn(
        "h-full w-sidebar shrink-0 flex-col border-r border-border bg-surface",
        className,
      )}
    >
      <UserSection user={user} />

      <div className="flex-1 overflow-y-auto px-2 py-2">
        <SectionHeading
          label="Channels"
          addLabel="Create channel"
          onAdd={() => setCreateOpen(true)}
          badge={totalUnread}
        />
        <ChannelList onNavigate={onNavigate} />

        <SectionHeading
          label="Direct Messages"
          addLabel="Start a direct message"
          onAdd={() => setDmPickerOpen(true)}
        />
        <DMList onNavigate={onNavigate} />
      </div>

      <CreateChannelModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <UserPicker open={dmPickerOpen} onClose={() => setDmPickerOpen(false)} />
    </aside>
  );
}
