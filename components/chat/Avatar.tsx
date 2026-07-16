"use client";

import { cn } from "@/lib/utils";
import type { UserSummary } from "@/lib/types";
import type { PresenceStatus } from "@/lib/socket-events";
import { PRESENCE_DOT, PRESENCE_LABEL } from "@/lib/usePresence";

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

/**
 * A 12px presence dot for the bottom-right of an avatar. The 2px ring matches
 * the surface behind the avatar so the dot reads as cut into it; callers on a
 * non-default background pass `ringClass` to match.
 */
export function StatusDot({
  status,
  ringClass = "ring-surface",
  sizeClass = "h-3 w-3",
}: {
  status: PresenceStatus;
  ringClass?: string;
  /** Overrides the default 12px dot (e.g. smaller on compact avatars). */
  sizeClass?: string;
}) {
  return (
    <span
      role="img"
      aria-label={PRESENCE_LABEL[status]}
      className={cn(
        "absolute -bottom-0.5 -right-0.5 rounded-full ring-2",
        sizeClass,
        PRESENCE_DOT[status],
        ringClass,
      )}
    />
  );
}

/**
 * 40px rounded user avatar with an initials fallback. Pass `status` to overlay
 * a presence dot; this wraps the avatar in a relative container so the dot can
 * anchor to its corner.
 */
export function Avatar({
  user,
  className,
  status,
  ringClass,
}: {
  user: Pick<UserSummary, "name" | "email" | "image">;
  className?: string;
  status?: PresenceStatus;
  ringClass?: string;
}) {
  const image = user.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.image}
      alt=""
      className={cn("h-10 w-10 rounded-full object-cover", className)}
    />
  ) : (
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

  if (!status) return image;

  return (
    <span className="relative inline-flex shrink-0">
      {image}
      <StatusDot status={status} ringClass={ringClass} />
    </span>
  );
}
