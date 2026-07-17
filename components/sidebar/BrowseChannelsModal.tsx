"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChannelSummary } from "@/lib/types";
import { useChannels } from "./ChannelsProvider";

/**
 * Modal for discovering and joining public channels. Fetches the channels the
 * user hasn't joined from `GET /api/channels/discover`; each row has a Join
 * button that posts to `POST /api/channels/[id]/join`, appends the channel to
 * the shared sidebar list, and navigates into it.
 */

type LoadStatus = "loading" | "ready" | "error";

export function BrowseChannelsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { channels, addChannel } = useChannels();

  const [discovered, setDiscovered] = useState<ChannelSummary[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  // Bump to re-run the discover fetch (initial open + retry).
  const [reloadNonce, setReloadNonce] = useState(0);
  // The channel id currently being joined, so we can show a spinner + disable.
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const titleId = useId();

  const reload = useCallback(() => {
    setStatus("loading");
    setReloadNonce((n) => n + 1);
  }, []);

  // Fetch the discover list each time the modal opens (or on retry).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setJoinError(null);
    (async () => {
      try {
        const res = await fetch("/api/channels/discover");
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const data: { channels?: ChannelSummary[] } = await res.json();
        if (cancelled) return;
        setDiscovered(data.channels ?? []);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, reloadNonce]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleJoin(channel: ChannelSummary) {
    setJoiningId(channel.id);
    setJoinError(null);
    try {
      const res = await fetch(`/api/channels/${channel.id}/join`, {
        method: "POST",
      });
      if (res.status === 201) {
        // Reflect the new membership in the sidebar and drop the row here.
        addChannel({
          ...channel,
          memberCount: channel.memberCount + 1,
          role: "MEMBER",
          unreadCount: 0,
        });
        setDiscovered((prev) => prev.filter((c) => c.id !== channel.id));
        onClose();
        router.push(`/channel/${channel.id}`);
        return;
      }
      if (res.status === 409) {
        // Already a member (e.g. joined in another tab): sync and drop the row.
        addChannel({ ...channel, role: "MEMBER", unreadCount: 0 });
        setDiscovered((prev) => prev.filter((c) => c.id !== channel.id));
        return;
      }
      const data: { error?: string } = await res.json().catch(() => ({}));
      setJoinError(data.error ?? "Couldn't join the channel. Please try again.");
    } catch {
      setJoinError("Network error. Please try again.");
    } finally {
      setJoiningId(null);
    }
  }

  // Guard against rows for channels already in the user's list (e.g. joined in
  // another tab since the discover fetch).
  const joinedIds = new Set(channels.map((c) => c.id));
  const rows = discovered.filter((c) => !joinedIds.has(c.id));

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
            Browse channels
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

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          {status === "loading" && (
            <p className="py-6 text-center text-sm text-text-muted">
              Loading channels…
            </p>
          )}

          {status === "error" && (
            <div className="py-6 text-center">
              <p className="text-sm text-danger">Couldn&apos;t load channels.</p>
              <button
                type="button"
                onClick={reload}
                className="mt-1 text-sm font-medium text-accent transition-colors duration-fast hover:text-accent-hover focus:outline-none focus-visible:shadow-focus"
              >
                Retry
              </button>
            </div>
          )}

          {status === "ready" && rows.length === 0 && (
            <p className="py-6 text-center text-sm text-text-muted">
              No more public channels to join.
            </p>
          )}

          {status === "ready" && rows.length > 0 && (
            <ul className="space-y-1">
              {rows.map((channel) => {
                const joining = joiningId === channel.id;
                return (
                  <li
                    key={channel.id}
                    className="flex items-center gap-3 rounded px-2 py-2 hover:bg-surface-raised"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 text-sm font-medium text-text">
                        <span aria-hidden="true" className="text-text-muted">
                          #
                        </span>
                        <span className="truncate">{channel.name}</span>
                      </p>
                      {channel.description && (
                        <p className="truncate text-xs text-text-muted">
                          {channel.description}
                        </p>
                      )}
                      <p className="text-xs text-text-muted">
                        {channel.memberCount}{" "}
                        {channel.memberCount === 1 ? "member" : "members"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleJoin(channel)}
                      disabled={joiningId !== null}
                      className="inline-flex h-8 shrink-0 items-center justify-center rounded bg-accent px-3 text-sm font-medium text-accent-fg transition-colors duration-fast hover:bg-accent-hover active:bg-accent-active focus:outline-none focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50"
                    >
                      {joining ? "Joining…" : "Join"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {joinError && (
            <p className="mt-2 text-xs text-danger" role="alert">
              {joinError}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
