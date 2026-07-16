"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ChannelSummary } from "@/lib/types";
import { useChannels } from "./ChannelsProvider";

/**
 * Modal dialog for creating a channel. Validates the name client-side
 * (lowercase, no spaces, 2–50 chars), posts to `POST /api/channels`, then adds
 * the new channel to the shared list, closes, and navigates to it.
 */

const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/** Returns an error message, or null when the name is valid. */
function validateName(raw: string): string | null {
  const name = raw.trim();
  if (name.length < 2) return "Name must be at least 2 characters.";
  if (name.length > 50) return "Name must be 50 characters or fewer.";
  if (/\s/.test(name)) return "Name can't contain spaces.";
  if (name !== name.toLowerCase()) return "Name must be lowercase.";
  if (!NAME_PATTERN.test(name)) {
    return "Use lowercase letters, numbers, and hyphens only.";
  }
  return null;
}

export function CreateChannelModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { addChannel } = useChannels();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nameId = useId();
  const descId = useId();
  const errorId = useId();

  // Reset the form each time the modal opens.
  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setIsPrivate(false);
      setError(null);
      setSubmitting(false);
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

  if (!open) return null;

  const validationError = validateName(name);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const invalid = validateName(name);
    if (invalid) {
      setError(invalid);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          isPrivate,
        }),
      });

      if (res.status === 201) {
        const data: { channel: ChannelSummary } = await res.json();
        addChannel(data.channel);
        onClose();
        router.push(`/channel/${data.channel.id}`);
        return;
      }

      if (res.status === 409) {
        setError("A channel with that name already exists.");
      } else {
        const data: { error?: string } = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't create the channel. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

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
        aria-labelledby={`${nameId}-title`}
        className="fixed left-1/2 top-1/2 z-modal w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface-overlay shadow-lg"
      >
        <form onSubmit={handleSubmit}>
          <header className="flex items-center justify-between px-6 pb-4 pt-6">
            <h2
              id={`${nameId}-title`}
              className="text-xl font-bold text-text"
            >
              Create channel
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

          <div className="space-y-4 px-6 pb-2">
            {/* Name */}
            <label className="block" htmlFor={nameId}>
              <span className="mb-1 block text-sm font-medium text-text-secondary">
                Name
              </span>
              <div className="flex items-center rounded border border-border-strong bg-surface-inset transition-colors duration-fast focus-within:border-accent focus-within:shadow-focus">
                <span className="pl-3 text-text-muted" aria-hidden="true">
                  #
                </span>
                <input
                  id={nameId}
                  type="text"
                  value={name}
                  autoFocus
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. marketing"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  className="h-10 w-full rounded-r bg-transparent px-2 text-md text-text placeholder:text-text-muted focus:outline-none"
                />
              </div>
              <span className="mt-1 block text-xs text-text-muted">
                Lowercase letters, numbers, and hyphens. 2–50 characters.
              </span>
            </label>

            {/* Description */}
            <label className="block" htmlFor={descId}>
              <span className="mb-1 block text-sm font-medium text-text-secondary">
                Description{" "}
                <span className="font-normal text-text-muted">(optional)</span>
              </span>
              <textarea
                id={descId}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this channel about?"
                rows={3}
                maxLength={500}
                className="min-h-[80px] w-full resize-y rounded border border-border-strong bg-surface-inset px-3 py-2 text-md leading-relaxed text-text placeholder:text-text-muted transition-colors duration-fast focus:border-accent focus:shadow-focus focus:outline-none"
              />
            </label>

            {/* Private toggle */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text">Private channel</p>
                <p className="text-xs text-text-muted">
                  Only invited members can view and join.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isPrivate}
                aria-label="Private channel"
                onClick={() => setIsPrivate((v) => !v)}
                className={cn(
                  "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-fast focus:outline-none focus-visible:shadow-focus",
                  isPrivate ? "bg-accent" : "bg-surface-raised",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-fast",
                    isPrivate ? "translate-x-5" : "translate-x-0.5",
                  )}
                />
              </button>
            </div>

            {error && (
              <p id={errorId} className="text-xs text-danger" role="alert">
                {error}
              </p>
            )}
          </div>

          <footer className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded border border-border bg-surface-raised px-4 text-md font-medium text-text transition-colors duration-fast hover:bg-surface-overlay focus:outline-none focus-visible:shadow-focus"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || validationError !== null}
              className="inline-flex h-10 items-center justify-center rounded bg-accent px-4 text-md font-medium text-accent-fg transition-colors duration-fast hover:bg-accent-hover active:bg-accent-active focus:outline-none focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create"}
            </button>
          </footer>
        </form>
      </div>
    </>
  );
}
