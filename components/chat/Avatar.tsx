"use client";

import { cn } from "@/lib/utils";
import type { UserSummary } from "@/lib/types";

/** Two-letter initials from a user's name or email, for the avatar fallback. */
function initials(user: Pick<UserSummary, "name" | "email">): string {
  const source = user.name ?? user.email ?? "?";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

/** 40px rounded user avatar with an initials fallback. */
export function Avatar({
  user,
  className,
}: {
  user: Pick<UserSummary, "name" | "email" | "image">;
  className?: string;
}) {
  if (user.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.image}
        alt=""
        className={cn("h-10 w-10 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full bg-accent-muted text-sm font-semibold text-accent",
        className,
      )}
    >
      {initials(user)}
    </span>
  );
}
