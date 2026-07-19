"use client";

import { useEffect, useId, useMemo } from "react";
import type { ChannelDetail, ChannelRole, UserSummary } from "@/lib/types";
import type { PresenceStatus } from "@/lib/socket-events";
import {
  PRESENCE_LABEL,
  presenceRank,
  usePresence,
} from "@/lib/usePresence";
import { Avatar } from "./Avatar";

/**
 * Slide-over info panel opened from the chat header (identity region or the
 * "Channel info" / "Contact info" menu item). Two variants via a `variant`
 * discriminant:
 *
 *  - `channel`: name, description, the full member roster (with live presence),
 *    and the Invite / Leave / Delete actions surfaced in one place. The action
 *    handlers are threaded through from `ChatView`, which owns the role gating
 *    and request state, so this panel is presentational for those.
 *  - `dm`: the other participant's large avatar, name, email, and presence.
 *
 * Reuses the overlay pattern from `InviteModal` (dimmed backdrop, Escape to
 * close, click-outside to close) and the shared design tokens. Anchored to the
 * right edge; full width on mobile, a fixed pane on wider screens.
 */

type InfoPanelProps = {
  open: boolean;
  onClose: () => void;
} & (
  | {
      variant: "channel";
      channel: ChannelDetail | null;
      currentUserId: string;
      /** Owner/admin-only invite handler; when omitted, no Invite action shows. */
      onInvite?: () => void;
      /** Leave handler; shown only when provided and `canLeave`. */
      onLeave?: () => void;
      /** False for owners, who can't leave their own channel. */
      canLeave?: boolean;
      /** True while a leave request is in flight. */
      leaving?: boolean;
      /** Owner-only delete handler; when omitted, no Delete action shows. */
      onDelete?: () => void;
      /** True while a delete request is in flight. */
      deleting?: boolean;
    }
  | {
      variant: "dm";
      user: UserSummary | null;
      status: PresenceStatus;
    }
);

/** Human label for a member's role; MEMBER is unlabelled (the common case). */
const ROLE_LABEL: Partial<Record<ChannelRole, string>> = {
  OWNER: "Owner",
  ADMIN: "Admin",
};

/** Rank so owner sorts before admin before member in the roster. */
function roleRank(role: ChannelRole): number {
  return role === "OWNER" ? 0 : role === "ADMIN" ? 1 : 2;
}

export function InfoPanel(props: InfoPanelProps) {
  const { open, onClose } = props;
  const titleId = useId();
  const { getStatus } = usePresence();

  // Close on Escape (click-outside is handled by the backdrop).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Roster ordered by role then presence then name, with the current user
  // pinned first. Computed unconditionally to keep hook order stable; only used
  // by the channel variant.
  const channel = props.variant === "channel" ? props.channel : null;
  const currentUserId =
    props.variant === "channel" ? props.currentUserId : null;
  const orderedMembers = useMemo(() => {
    const members = channel?.members ?? [];
    return [...members].sort((a, b) => {
      if (a.userId === currentUserId) return -1;
      if (b.userId === currentUserId) return 1;
      const byRole = roleRank(a.role) - roleRank(b.role);
      if (byRole !== 0) return byRole;
      const byPresence =
        presenceRank(getStatus(a.userId)) - presenceRank(getStatus(b.userId));
      if (byPresence !== 0) return byPresence;
      const an = a.user.name ?? a.user.email ?? "";
      const bn = b.user.name ?? b.user.email ?? "";
      return an.localeCompare(bn);
    });
  }, [channel, currentUserId, getStatus]);

  if (!open) return null;

  const title = props.variant === "dm" ? "Contact info" : "Channel info";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-overlay bg-black/60 backdrop-blur-sm transition-opacity duration-slow"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed right-0 top-0 z-modal flex h-full w-full max-w-sm flex-col border-l border-border bg-panel shadow-lg"
      >
        <header className="flex h-topbar shrink-0 items-center gap-3 bg-header px-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors duration-fast hover:bg-surface-raised hover:text-text focus:outline-none focus-visible:shadow-focus"
          >
            ✕
          </button>
          <h2 id={titleId} className="text-name font-medium text-text">
            {title}
          </h2>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {props.variant === "dm" ? (
            <DmInfo user={props.user} status={props.status} />
          ) : (
            <ChannelInfo
              channel={props.channel}
              currentUserId={props.currentUserId}
              members={orderedMembers}
              getStatus={getStatus}
              onInvite={props.onInvite}
              onLeave={props.onLeave}
              canLeave={props.canLeave}
              leaving={props.leaving}
              onDelete={props.onDelete}
              deleting={props.deleting}
            />
          )}
        </div>
      </aside>
    </>
  );
}

/** DM variant body: large avatar, name, presence, email. */
function DmInfo({
  user,
  status,
}: {
  user: UserSummary | null;
  status: PresenceStatus;
}) {
  if (!user) {
    return (
      <p className="px-6 py-10 text-center text-sm text-text-muted">
        This conversation is no longer available.
      </p>
    );
  }

  const name = user.name ?? user.email ?? "Direct message";

  return (
    <div>
      <section className="flex flex-col items-center gap-3 border-b border-border-subtle px-6 py-8 text-center">
        <Avatar
          user={user}
          className="h-24 w-24 text-2xl"
          status={status}
          ringClass="ring-panel"
        />
        <div className="min-w-0">
          <p className="truncate text-title font-medium text-text">{name}</p>
          <p className="text-sm text-text-secondary">
            {PRESENCE_LABEL[status]}
          </p>
        </div>
      </section>

      {user.email && (
        <section className="px-6 py-4">
          <p className="text-tick uppercase tracking-wide text-text-muted">
            Email
          </p>
          <p className="mt-1 break-all text-sm text-text">{user.email}</p>
        </section>
      )}
    </div>
  );
}

/** Channel variant body: identity, description, actions, member roster. */
function ChannelInfo({
  channel,
  currentUserId,
  members,
  getStatus,
  onInvite,
  onLeave,
  canLeave,
  leaving,
  onDelete,
  deleting,
}: {
  channel: ChannelDetail | null;
  currentUserId: string;
  members: ChannelDetail["members"];
  getStatus: (userId: string) => PresenceStatus;
  onInvite?: () => void;
  onLeave?: () => void;
  canLeave?: boolean;
  leaving?: boolean;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  if (!channel) {
    return (
      <p className="px-6 py-10 text-center text-sm text-text-muted">
        Loading channel…
      </p>
    );
  }

  const hasActions =
    Boolean(onInvite) || (Boolean(onLeave) && canLeave) || Boolean(onDelete);

  return (
    <div>
      <section className="flex flex-col items-center gap-3 border-b border-border-subtle px-6 py-8 text-center">
        <span className="flex h-24 w-24 items-center justify-center rounded-full bg-surface-raised text-text-secondary">
          <GroupIcon />
        </span>
        <div className="min-w-0">
          <p className="truncate text-title font-medium text-text">
            {channel.name}
          </p>
          <p className="text-sm text-text-secondary">
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>
        </div>
      </section>

      {channel.description && (
        <section className="border-b border-border-subtle px-6 py-4">
          <p className="text-tick uppercase tracking-wide text-text-muted">
            Description
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-text">
            {channel.description}
          </p>
        </section>
      )}

      {hasActions && (
        <section className="border-b border-border-subtle py-1">
          {onInvite && (
            <ActionRow onClick={onInvite}>Invite people</ActionRow>
          )}
          {onLeave && canLeave && (
            <ActionRow danger disabled={leaving} onClick={onLeave}>
              {leaving ? "Leaving…" : "Leave channel"}
            </ActionRow>
          )}
          {onDelete && (
            <ActionRow danger disabled={deleting} onClick={onDelete}>
              {deleting ? "Deleting…" : "Delete channel"}
            </ActionRow>
          )}
        </section>
      )}

      <section className="px-6 py-4">
        <p className="mb-2 text-tick uppercase tracking-wide text-text-muted">
          {members.length} {members.length === 1 ? "member" : "members"}
        </p>
        <ul className="space-y-1">
          {members.map((m) => {
            const status = getStatus(m.userId);
            const isSelf = m.userId === currentUserId;
            const displayName = isSelf
              ? "You"
              : m.user.name ?? m.user.email ?? "Someone";
            const roleLabel = ROLE_LABEL[m.role];
            return (
              <li
                key={m.userId}
                className="flex items-center gap-3 rounded px-2 py-2 hover:bg-surface-raised"
              >
                <Avatar
                  user={m.user}
                  className="h-avatar w-avatar"
                  status={status}
                  ringClass="ring-panel"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">
                    {displayName}
                  </p>
                  {m.user.email && !isSelf && (
                    <p className="truncate text-xs text-text-muted">
                      {m.user.email}
                    </p>
                  )}
                </div>
                {roleLabel && (
                  <span className="shrink-0 rounded-full bg-surface-raised px-2 py-0.5 text-xs text-text-secondary">
                    {roleLabel}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/** A full-width action row inside the channel panel (Invite / Leave / Delete). */
function ActionRow({
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
      disabled={disabled}
      onClick={onClick}
      className={
        "flex h-11 w-full items-center px-6 text-sm transition-colors duration-fast hover:bg-surface-raised focus:outline-none focus-visible:bg-surface-raised disabled:pointer-events-none disabled:opacity-50 " +
        (danger ? "text-danger" : "text-text")
      }
    >
      {children}
    </button>
  );
}

/** Group glyph mirroring the channel avatar in the header. */
function GroupIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" aria-hidden="true">
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
