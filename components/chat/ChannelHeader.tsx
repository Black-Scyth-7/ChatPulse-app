"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Channel header bar: name, optional description, and member count. Sits at the
 * top of the chat view above the message list. When `onLeave` is provided, an
 * options menu (⋯) exposes a "Leave channel" action; channel owners can't leave
 * (`canLeave={false}`), so the item is shown disabled with an explanation.
 */
export function ChannelHeader({
  name,
  description,
  memberCount,
  onlineCount,
  onLeave,
  canLeave = true,
  leaving = false,
}: {
  name: string;
  description: string | null;
  memberCount: number;
  /** Members currently online or away; appended as "Y online" when provided. */
  onlineCount?: number;
  /** Leave handler; when omitted, no options menu is rendered. */
  onLeave?: () => void;
  /** False for owners, who can't leave their own channel. */
  canLeave?: boolean;
  /** True while a leave request is in flight. */
  leaving?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close the menu on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  return (
    <header className="flex h-topbar shrink-0 items-center gap-3 border-b border-border px-4">
      <h1 className="flex min-w-0 items-center gap-1 text-md font-semibold text-text">
        <span aria-hidden="true" className="text-text-muted">
          #
        </span>
        <span className="truncate">{name}</span>
      </h1>
      {description && (
        <>
          <span aria-hidden="true" className="text-border-strong">
            |
          </span>
          <p className="min-w-0 flex-1 truncate text-sm text-text-secondary">
            {description}
          </p>
        </>
      )}
      <span className="ml-auto shrink-0 whitespace-nowrap text-sm text-text-muted">
        {memberCount} {memberCount === 1 ? "member" : "members"}
        {onlineCount !== undefined && `, ${onlineCount} online`}
      </span>

      {onLeave && (
        <div ref={ref} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Channel options"
            className="flex h-7 w-7 items-center justify-center rounded text-text-muted transition-colors duration-fast hover:bg-surface-raised hover:text-text focus:outline-none focus-visible:shadow-focus"
          >
            <span aria-hidden="true" className="text-base leading-none">
              ⋯
            </span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-dropdown mt-1 min-w-48 rounded-md border border-border bg-surface-overlay py-1 shadow-md"
            >
              {canLeave ? (
                <button
                  type="button"
                  role="menuitem"
                  disabled={leaving}
                  onClick={() => {
                    setMenuOpen(false);
                    onLeave();
                  }}
                  className="flex h-9 w-full items-center px-3 text-sm text-danger transition-colors duration-fast hover:bg-surface-raised focus:outline-none focus-visible:bg-surface-raised disabled:pointer-events-none disabled:opacity-50"
                >
                  {leaving ? "Leaving…" : "Leave channel"}
                </button>
              ) : (
                <div className="px-3 py-2 text-xs text-text-muted">
                  Owners can&apos;t leave their own channel.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
