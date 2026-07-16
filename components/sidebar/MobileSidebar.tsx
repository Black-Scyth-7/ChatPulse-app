"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar, type SidebarUser } from "./Sidebar";

/**
 * Mobile navigation: a top header with a hamburger button (shown below `md`)
 * that opens the sidebar as a slide-out drawer. Selecting a channel or DM
 * closes the drawer (via `Sidebar`'s `onNavigate`). Also closes on route change
 * and on Escape.
 */

function HamburgerIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function MobileSidebar({ user }: { user: SidebarUser }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close when the route changes (e.g. after navigating to a channel).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Mobile top bar with hamburger (hidden at md+) */}
      <header className="flex h-topbar shrink-0 items-center gap-2 border-b border-border bg-surface px-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded text-text-secondary transition-colors duration-fast hover:bg-surface-raised hover:text-text focus:outline-none focus-visible:shadow-focus"
        >
          <HamburgerIcon />
        </button>
        <span className="font-semibold text-text">ChatPulse</span>
      </header>

      {/* Drawer */}
      {open && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-overlay bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-modal">
            <Sidebar
              user={user}
              className="flex"
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
