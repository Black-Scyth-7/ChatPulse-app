"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { UserSummary } from "@/lib/types";
import type { PresenceStatus } from "@/lib/socket-events";
import { Avatar } from "./Avatar";
import { BackToListButton } from "./BackToListButton";

/**
 * WhatsApp-style chat header (per-panel top bar for the chat view). Handles both
 * conversation kinds via a `variant` discriminant:
 *
 *  - `dm`: participant avatar (with a live presence dot), name, and a presence
 *    subtitle ("online" / "away" / "offline").
 *  - `channel`: a group icon, channel name, and a truncated member-name preview
 *    ("You, Alice, Bob, +4").
 *
 * The right side carries a ⋯ menu. The channel menu exposes Channel info ·
 * Invite · Leave/Delete; the DM menu exposes Contact info. Real actions
 * (Invite/Leave/Delete) are wired through props and gated by the caller on role;
 * the info action opens a panel when `onOpenInfo` is provided.
 */

type ChatHeaderProps =
  | {
      variant: "dm";
      /** The other participant; null while the conversation is still resolving. */
      user: UserSummary | null;
      status: PresenceStatus;
      /** Opens the user profile panel (placeholder until that panel lands). */
      onOpenInfo?: () => void;
    }
  | {
      variant: "channel";
      name: string;
      /** Member display names, current user first as "You"; drives the preview. */
      memberNames: string[];
      /** Opens the group info panel (placeholder until that panel lands). */
      onOpenInfo?: () => void;
      /** Owner/admin-only invite handler; when omitted, no Invite item is shown. */
      onInvite?: () => void;
      /** Leave handler; shown only when provided and `canLeave`. */
      onLeave?: () => void;
      /** False for owners, who can't leave their own channel. */
      canLeave?: boolean;
      /** True while a leave request is in flight. */
      leaving?: boolean;
      /** Owner-only delete handler; when omitted, no Delete item is shown. */
      onDelete?: () => void;
      /** True while a delete request is in flight. */
      deleting?: boolean;
    };

/** Subtitle wording for a DM's presence state. */
const DM_STATUS_LABEL: Record<PresenceStatus, string> = {
  online: "online",
  away: "away",
  offline: "offline",
};

/** Build the channel subtitle: first few member names, then "+N" for the rest. */
function memberPreview(names: string[]): string {
  if (names.length === 0) return "No members yet";
  const MAX = 3;
  if (names.length <= MAX) return names.join(", ");
  return `${names.slice(0, MAX).join(", ")}, +${names.length - MAX}`;
}

function GroupIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <circle cx="9" cy="8.5" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M3.5 19a5.5 5.5 0 0 1 11 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M16 6.2a3 3 0 0 1 0 5.6M17 19a5.5 5.5 0 0 0-2.2-4.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

export function ChatHeader(props: ChatHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const isDm = props.variant === "dm";
  const title = isDm
    ? props.user?.name ?? props.user?.email ?? "Direct message"
    : props.name;
  const subtitle = isDm
    ? DM_STATUS_LABEL[props.status]
    : memberPreview(props.memberNames);

  const avatar = isDm ? (
    props.user ? (
      <Avatar
        user={props.user}
        className="h-avatar w-avatar"
        status={props.status}
        ringClass="ring-header"
      />
    ) : (
      <span className="h-avatar w-avatar shrink-0 rounded-full bg-surface-raised" />
    )
  ) : (
    <span className="flex h-avatar w-avatar shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-secondary">
      <GroupIcon />
    </span>
  );

  // The identity region (avatar + name/subtitle) opens the info/profile panel
  // when a handler is provided; otherwise it's inert (panel not built yet).
  const identityInner = (
    <>
      {avatar}
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-name font-medium text-text">
          {title}
        </span>
        <span className="block truncate text-tick text-text-secondary">
          {subtitle}
        </span>
      </span>
    </>
  );

  return (
    <header className="flex h-topbar shrink-0 items-center gap-3 bg-header px-4">
      <BackToListButton />

      {props.onOpenInfo ? (
        <button
          type="button"
          onClick={props.onOpenInfo}
          className="flex min-w-0 flex-1 items-center gap-3 rounded text-left transition-colors duration-fast focus:outline-none focus-visible:shadow-focus"
        >
          {identityInner}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {identityInner}
        </div>
      )}

      <div className="flex shrink-0 items-center gap-1">
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="More options"
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors duration-fast hover:bg-surface-raised hover:text-text focus:outline-none focus-visible:shadow-focus"
          >
            <MoreIcon />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-dropdown mt-1 min-w-48 overflow-hidden rounded-md border border-border bg-surface-overlay py-1 shadow-md"
            >
              <MenuItem
                onClick={() => {
                  setMenuOpen(false);
                  props.onOpenInfo?.();
                }}
              >
                {isDm ? "Contact info" : "Channel info"}
              </MenuItem>

              {!isDm && props.onInvite && (
                <MenuItem
                  onClick={() => {
                    setMenuOpen(false);
                    props.onInvite?.();
                  }}
                >
                  Invite
                </MenuItem>
              )}

              {!isDm && props.onLeave && props.canLeave && (
                <MenuItem
                  danger
                  disabled={props.leaving}
                  onClick={() => {
                    setMenuOpen(false);
                    props.onLeave?.();
                  }}
                >
                  {props.leaving ? "Leaving…" : "Leave channel"}
                </MenuItem>
              )}
              {!isDm && props.onDelete && (
                <MenuItem
                  danger
                  disabled={props.deleting}
                  onClick={() => {
                    setMenuOpen(false);
                    props.onDelete?.();
                  }}
                >
                  {props.deleting ? "Deleting…" : "Delete channel"}
                </MenuItem>
              )}
              {!isDm &&
                props.onLeave &&
                !props.canLeave &&
                !props.onDelete && (
                  <div className="px-3 py-2 text-xs text-text-muted">
                    Owners can&apos;t leave their own channel.
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuItem({
  children,
  onClick,
  danger = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-9 w-full items-center px-3 text-sm transition-colors duration-fast hover:bg-surface-raised focus:outline-none focus-visible:bg-surface-raised disabled:pointer-events-none disabled:opacity-50",
        danger ? "text-danger" : "text-text",
      )}
    >
      {children}
    </button>
  );
}
