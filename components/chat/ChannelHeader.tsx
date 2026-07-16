"use client";

/**
 * Channel header bar: name, optional description, and member count. Sits at the
 * top of the chat view above the message list.
 */
export function ChannelHeader({
  name,
  description,
  memberCount,
}: {
  name: string;
  description: string | null;
  memberCount: number;
}) {
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
      </span>
    </header>
  );
}
