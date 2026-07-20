"use client";

import { apiUrl } from "@/lib/apiBase";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { UserSummary } from "@/lib/types";
import { usePresence } from "@/lib/usePresence";
import { Avatar } from "./Avatar";

/**
 * Modal for inviting users to a channel. Opened from the channel header by an
 * OWNER/ADMIN. Fetches the users who aren't members yet from
 * `GET /api/channels/[id]/non-members`, filters them by a search box, and lets
 * the owner add each with `POST /api/channels/[id]/invite`.
 *
 * On a successful invite the row flashes a green checkmark, then the user is
 * removed from the list. Failures surface as an auto-dismissing toast. The
 * invited user's own sidebar updates in real time via the `channel:invited`
 * socket event (emitted server-side by the invite route).
 */

type LoadStatus = "loading" | "ready" | "error";

/** How long the green checkmark shows before the row is dropped. */
const CHECK_MS = 900;
/** How long an error toast stays up. */
const TOAST_MS = 4000;

export function InviteModal({
  channelId,
  open,
  onClose,
}: {
  channelId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { getStatus } = usePresence();

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [reloadNonce, setReloadNonce] = useState(0);
  const [query, setQuery] = useState("");
  // The user id currently being invited (spinner + disabled), and ids that just
  // succeeded (green checkmark, pending removal).
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const titleId = useId();
  const searchId = useId();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(() => {
    setStatus("loading");
    setReloadNonce((n) => n + 1);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  // Reset transient state and fetch the non-member list each time we open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setQuery("");
    setInvitingId(null);
    setInvitedIds(new Set());
    setToast(null);
    (async () => {
      try {
        const res = await fetch(apiUrl(`/api/channels/${channelId}/non-members`));
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const data: { users?: UserSummary[] } = await res.json();
        if (cancelled) return;
        setUsers(data.users ?? []);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, channelId, reloadNonce]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Clear any pending toast timer on unmount.
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.name ?? "").toLowerCase().includes(q));
  }, [users, query]);

  const handleInvite = useCallback(
    async (user: UserSummary) => {
      setInvitingId(user.id);
      try {
        const res = await fetch(apiUrl(`/api/channels/${channelId}/invite`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        });
        if (res.status === 201 || res.status === 409) {
          // 409 = already a member (e.g. invited in another tab); treat as done.
          setInvitedIds((prev) => new Set(prev).add(user.id));
          // Flash the checkmark, then drop the row from the list.
          setTimeout(() => {
            setUsers((prev) => prev.filter((u) => u.id !== user.id));
            setInvitedIds((prev) => {
              const next = new Set(prev);
              next.delete(user.id);
              return next;
            });
          }, CHECK_MS);
          return;
        }
        const data: { error?: string } = await res.json().catch(() => ({}));
        showToast(data.error ?? "Couldn't invite this user. Please try again.");
      } catch {
        showToast("Network error. Please try again.");
      } finally {
        setInvitingId(null);
      }
    },
    [channelId, showToast],
  );

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-overlay bg-black/60 backdrop-blur-sm transition-opacity duration-slow"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed left-1/2 top-1/2 z-modal flex max-h-[80vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-border bg-surface-overlay shadow-lg"
      >
        <header className="flex items-center justify-between px-6 pb-4 pt-6">
          <h2 id={titleId} className="text-xl font-bold text-text">
            Invite people
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1.5 text-text-secondary transition-colors duration-fast hover:bg-surface-raised hover:text-text focus:outline-none focus-visible:shadow-focus"
          >
            ✕
          </button>
        </header>

        {/* Search */}
        <div className="px-6 pb-3">
          <label className="sr-only" htmlFor={searchId}>
            Search people by name
          </label>
          <input
            id={searchId}
            type="text"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            className="h-10 w-full rounded border border-border-strong bg-surface-inset px-3 text-md text-text placeholder:text-text-muted transition-colors duration-fast focus:border-accent focus:shadow-focus focus:outline-none"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          {status === "loading" && (
            <p className="py-6 text-center text-sm text-text-muted">
              Loading people…
            </p>
          )}

          {status === "error" && (
            <div className="py-6 text-center">
              <p className="text-sm text-danger">Couldn&apos;t load people.</p>
              <button
                type="button"
                onClick={reload}
                className="mt-1 text-sm font-medium text-accent transition-colors duration-fast hover:text-accent-hover focus:outline-none focus-visible:shadow-focus"
              >
                Retry
              </button>
            </div>
          )}

          {status === "ready" && filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-text-muted">
              {users.length === 0
                ? "Everyone is already in this channel."
                : "No people match your search."}
            </p>
          )}

          {status === "ready" && filtered.length > 0 && (
            <ul className="space-y-1">
              {filtered.map((user) => {
                const inviting = invitingId === user.id;
                const invited = invitedIds.has(user.id);
                return (
                  <li
                    key={user.id}
                    className="flex items-center gap-3 rounded px-2 py-2 hover:bg-surface-raised"
                  >
                    <Avatar
                      user={user}
                      className="h-9 w-9"
                      status={getStatus(user.id)}
                      ringClass="ring-surface-overlay"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">
                        {user.name ?? "Unnamed user"}
                      </p>
                      {user.email && (
                        <p className="truncate text-xs text-text-muted">
                          {user.email}
                        </p>
                      )}
                    </div>
                    {invited ? (
                      <span
                        className="inline-flex h-8 shrink-0 items-center gap-1 px-3 text-sm font-medium text-success"
                        role="status"
                      >
                        <span aria-hidden="true">✓</span> Invited
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleInvite(user)}
                        disabled={invitingId !== null}
                        className="inline-flex h-8 shrink-0 items-center justify-center rounded bg-accent px-3 text-sm font-medium text-accent-fg transition-colors duration-fast hover:bg-accent-hover active:bg-accent-active focus:outline-none focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50"
                      >
                        {inviting ? "Inviting…" : "Invite"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Error toast */}
      {toast && (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 z-toast -translate-x-1/2 rounded-md border border-danger bg-danger-muted px-4 py-2 text-sm text-danger shadow-md"
        >
          {toast}
        </div>
      )}
    </>
  );
}
