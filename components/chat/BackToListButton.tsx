"use client";

import Link from "next/link";

/**
 * Mobile-only back arrow shown at the start of a chat header. Returns to the
 * conversation list (`/`), which on mobile replaces the full-screen chat view.
 * Hidden at `md`+ where the list and chat sit side by side.
 */
export function BackToListButton() {
  return (
    <Link
      href="/"
      aria-label="Back to conversations"
      className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors duration-fast hover:bg-surface-raised hover:text-text focus:outline-none focus-visible:shadow-focus md:hidden"
    >
      <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </Link>
  );
}
