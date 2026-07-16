"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useChannels } from "./ChannelsProvider";
import { useDMConversations } from "./DMConversationsProvider";

/**
 * Cmd/Ctrl+K quick switcher. A lightweight command palette that fuzzily filters
 * the user's channels and DM conversations and jumps to the selected one.
 * Opens on the keyboard shortcut, closes on Escape (or after navigating), and
 * supports arrow-key navigation. Reads from the shared channel/DM stores so it
 * never triggers its own fetch.
 */

interface SwitcherItem {
  key: string;
  href: string;
  label: string;
  /** Leading glyph: "#" for channels, initials-less dot for DMs. */
  kind: "channel" | "dm";
}

export function QuickSwitcher() {
  const router = useRouter();
  const { channels } = useChannels();
  const { conversations } = useDMConversations();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  // Global shortcut: Cmd+K (mac) / Ctrl+K (win/linux) toggles the switcher.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Reset query/selection each time the palette opens, and focus the input.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Focus after paint so the freshly-mounted input is in the DOM.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const items = useMemo<SwitcherItem[]>(() => {
    const channelItems: SwitcherItem[] = channels.map((c) => ({
      key: `channel:${c.id}`,
      href: `/channel/${c.id}`,
      label: c.name,
      kind: "channel",
    }));
    const dmItems: SwitcherItem[] = conversations.map((d) => ({
      key: `dm:${d.id}`,
      href: `/dm/${d.id}`,
      label: d.otherUser?.name ?? d.otherUser?.email ?? "Unknown user",
      kind: "dm",
    }));
    const q = query.trim().toLowerCase();
    const all = [...channelItems, ...dmItems];
    if (!q) return all;
    return all.filter((i) => i.label.toLowerCase().includes(q));
  }, [channels, conversations, query]);

  // Keep the highlighted row within the (possibly shrunken) result set.
  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, items.length - 1)));
  }, [items.length]);

  if (!open) return null;

  const go = (item: SwitcherItem | undefined) => {
    if (!item) return;
    setOpen(false);
    router.push(item.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (items.length ? (i + 1) % items.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) =>
        items.length ? (i - 1 + items.length) % items.length : 0,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(items[activeIndex]);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-overlay bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Palette */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick switcher"
        onKeyDown={onKeyDown}
        className="fixed left-1/2 top-24 z-modal w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-surface-overlay shadow-lg"
      >
        <div className="border-b border-border px-4 py-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Jump to a channel or person…"
            aria-controls={listId}
            className="w-full bg-transparent text-md text-text placeholder:text-text-muted focus:outline-none"
          />
        </div>

        <ul id={listId} className="max-h-80 overflow-y-auto p-2">
          {items.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-text-muted">
              No matches.
            </li>
          ) : (
            items.map((item, i) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => go(item)}
                  onMouseMove={() => setActiveIndex(i)}
                  aria-current={i === activeIndex ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition-colors duration-fast",
                    i === activeIndex
                      ? "bg-accent-muted text-text"
                      : "text-text-secondary hover:bg-surface-raised",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="w-4 shrink-0 text-center text-text-muted"
                  >
                    {item.kind === "channel" ? "#" : "@"}
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-text-muted">
          <span>
            <span className="font-medium">↑↓</span> to navigate ·{" "}
            <span className="font-medium">↵</span> to open
          </span>
          <span>
            <span className="font-medium">Esc</span> to close
          </span>
        </div>
      </div>
    </>
  );
}
