import { cn } from "@/lib/utils";

/**
 * A single shimmering placeholder block. Uses Tailwind's `animate-pulse` over a
 * raised-surface fill so loading states occupy the same footprint as the real
 * content and don't jump the layout when data arrives.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded bg-surface-raised", className)}
    />
  );
}

/** Placeholder rows for the sidebar channel list. */
export function ChannelListSkeleton() {
  return (
    <ul className="space-y-0.5" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex h-8 items-center gap-2 px-2">
          <Skeleton className="h-3.5 w-3.5 rounded-sm" />
          <Skeleton className={cn("h-3.5", ROW_WIDTHS[i % ROW_WIDTHS.length])} />
        </li>
      ))}
    </ul>
  );
}

/** Placeholder rows for the sidebar DM list (avatar + two text lines). */
export function DMListSkeleton() {
  return (
    <ul className="space-y-0.5" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex h-11 items-center gap-2 px-2">
          <Skeleton className="h-avatar-sm w-avatar-sm rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className={cn("h-3", ROW_WIDTHS[i % ROW_WIDTHS.length])} />
            <Skeleton className="h-2.5 w-2/3" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Placeholder message groups for the main message list. */
export function MessageListSkeleton() {
  return (
    <div className="flex flex-1 flex-col justify-end gap-5 px-4 py-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-avatar w-avatar shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2.5 w-12" />
            </div>
            <Skeleton className={cn("h-3", MSG_WIDTHS[i % MSG_WIDTHS.length])} />
            {i % 3 === 0 && <Skeleton className="h-3 w-1/2" />}
          </div>
        </div>
      ))}
    </div>
  );
}

// Varied widths so the placeholders read as text rather than uniform bars.
const ROW_WIDTHS = ["w-24", "w-16", "w-28", "w-20", "w-32", "w-14"];
const MSG_WIDTHS = ["w-3/4", "w-2/3", "w-11/12", "w-1/2", "w-5/6", "w-3/5"];
