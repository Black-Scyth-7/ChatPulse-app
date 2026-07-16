"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DmConversationSummary, UserSummary } from "@/lib/types";
import { useDMConversations } from "./DMConversationsProvider";

/**
 * Modal for starting a new direct message. Presents a search box that filters
 * users by name/email (via `GET /api/users?q=`) and a result list; clicking a
 * user creates (or fetches) the 1:1 conversation through `POST /api/dm`, adds
 * it to the shared DM store, then navigates to `/dm/[id]`.
 */

/** Debounce (ms) between the last keystroke and firing the search request. */
const SEARCH_DEBOUNCE_MS = 200;

function initials(user: UserSummary): string {
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

export function UserPicker({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { upsertConversation } = useDMConversations();

  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const titleId = useId();

  // Reset state each time the modal opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setUsers([]);
      setError(null);
      setCreatingId(null);
    }
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Debounced user search. Runs on open (empty query → first page) and on each
  // query change; races are guarded with a cancellation flag.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users?q=${encodeURIComponent(query.trim())}`,
        );
        if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
        const data: { users?: UserSummary[] } = await res.json();
        if (cancelled) return;
        setUsers(data.users ?? []);
        setError(null);
      } catch {
        if (!cancelled) setError("Couldn't load users. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query]);

  async function startDm(user: UserSummary) {
    if (creatingId) return;
    setCreatingId(user.id);
    setError(null);
    try {
      const res = await fetch("/api/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't start the conversation.");
        setCreatingId(null);
        return;
      }
      const data: { conversation: DmConversationSummary } = await res.json();
      upsertConversation(data.conversation);
      onClose();
      router.push(`/dm/${data.conversation.id}`);
    } catch {
      setError("Network error. Please try again.");
      setCreatingId(null);
    }
  }

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
            New message
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

        <div className="px-6 pb-3">
          <input
            type="text"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people by name…"
            aria-label="Search people"
            className="h-10 w-full rounded border border-border-strong bg-surface-inset px-3 text-md text-text placeholder:text-text-muted transition-colors duration-fast focus:border-accent focus:shadow-focus focus:outline-none"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {error && (
            <p className="px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          {!error && loading && users.length === 0 && (
            <p className="px-3 py-2 text-sm text-text-muted">Searching…</p>
          )}

          {!error && !loading && users.length === 0 && (
            <p className="px-3 py-2 text-sm text-text-muted">
              No people found.
            </p>
          )}

          <ul className="space-y-0.5">
            {users.map((user) => {
              const name = user.name ?? user.email ?? "Unknown user";
              return (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => startDm(user)}
                    disabled={creatingId !== null}
                    className="flex w-full items-center gap-3 rounded px-3 py-2 text-left transition-colors duration-fast hover:bg-surface-raised focus:outline-none focus-visible:bg-surface-raised disabled:opacity-60"
                  >
                    <span className="shrink-0">
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
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text">
                        {name}
                      </span>
                      {user.email && (
                        <span className="block truncate text-xs text-text-muted">
                          {user.email}
                        </span>
                      )}
                    </span>
                    {creatingId === user.id && (
                      <span className="shrink-0 text-xs text-text-muted">
                        Opening…
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}
