"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Direct-message conversation list. Placeholder for now — real DM data lands in
 * a later task. Renders a few sample rows so the section has visible structure;
 * each row links to `/dm/[id]` (a stub page).
 */

type Presence = "online" | "away" | "dnd" | "offline";

const PRESENCE_DOT: Record<Presence, string> = {
  online: "bg-success",
  away: "bg-warning",
  dnd: "bg-danger",
  offline: "bg-offline",
};

// Placeholder conversations until the DM API is wired up.
const PLACEHOLDER_DMS: Array<{
  id: string;
  name: string;
  presence: Presence;
}> = [
  { id: "sample-ada", name: "Ada Lovelace", presence: "online" },
  { id: "sample-grace", name: "Grace Hopper", presence: "away" },
  { id: "sample-alan", name: "Alan Turing", presence: "offline" },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function DMList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <ul className="space-y-0.5">
      {PLACEHOLDER_DMS.map((dm) => {
        const active = pathname === `/dm/${dm.id}`;
        return (
          <li key={dm.id}>
            <Link
              href={`/dm/${dm.id}`}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-8 items-center gap-2 rounded px-2 text-sm transition-colors duration-fast focus:outline-none focus-visible:shadow-focus",
                active
                  ? "bg-accent-muted font-medium text-text"
                  : "text-text-secondary hover:bg-surface-raised hover:text-text",
              )}
            >
              <span className="relative shrink-0">
                <span className="flex h-avatar-sm w-avatar-sm items-center justify-center rounded-full bg-accent-muted text-[10px] font-semibold text-accent">
                  {initials(dm.name)}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface",
                    PRESENCE_DOT[dm.presence],
                  )}
                />
              </span>
              <span className="flex-1 truncate">{dm.name}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
