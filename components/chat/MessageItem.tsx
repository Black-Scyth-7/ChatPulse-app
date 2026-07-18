"use client";

import { useEffect, useRef, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/useChatMessages";
import type { MessageStatus } from "@/lib/types";
import { Avatar } from "./Avatar";
import { Markdown } from "./Markdown";

/**
 * WhatsApp-style read-receipt indicator for the author's own messages:
 * SENT → single check, DELIVERED → double check, READ → blue double check.
 */
function ReadReceipt({ status }: { status: MessageStatus }) {
  const label =
    status === "READ"
      ? "Read"
      : status === "DELIVERED"
        ? "Delivered"
        : "Sent";
  return (
    <span
      className={cn(
        "inline-flex select-none align-baseline text-xs leading-none",
        status === "READ" ? "text-accent" : "text-text-muted",
      )}
      title={label}
      aria-label={label}
    >
      {status === "SENT" ? "✓" : "✓✓"}
    </span>
  );
}

/** Full timestamp for the title attribute / hover, e.g. "Jul 16, 2026 3:04 PM". */
function fullTimestamp(iso: string): string {
  return format(new Date(iso), "PPp");
}

/** Relative time such as "5 minutes ago". */
function relativeTime(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

/** Compact time-only stamp shown in the gutter of grouped messages. */
function gutterTime(iso: string): string {
  return format(new Date(iso), "p");
}

function HoverActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="absolute right-4 top-0 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-border bg-surface-overlay p-0.5 shadow-sm group-hover:flex">
      <button
        type="button"
        onClick={onEdit}
        className="rounded px-2 py-1 text-xs text-text-secondary transition-colors duration-fast hover:bg-surface-raised hover:text-text focus:outline-none focus-visible:shadow-focus"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="rounded px-2 py-1 text-xs text-danger transition-colors duration-fast hover:bg-danger-muted focus:outline-none focus-visible:shadow-focus"
      >
        Delete
      </button>
    </div>
  );
}

function EditForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (body: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, []);

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) onSave(trimmed);
    else onCancel();
  };

  return (
    <div className="mt-1">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        rows={2}
        className="w-full resize-none rounded-md border border-border-strong bg-surface-inset px-3 py-2 text-base text-text outline-none focus:border-accent"
      />
      <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
        <button
          type="button"
          onClick={submit}
          className="rounded bg-accent px-2 py-1 font-medium text-accent-fg hover:bg-accent-hover"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-2 py-1 hover:text-text"
        >
          Cancel
        </button>
        <span>escape to cancel · enter to save</span>
      </div>
    </div>
  );
}

/**
 * A single rendered message. `showHeader` controls grouping: the first message
 * in a run from an author shows the avatar + name + timestamp; grouped
 * followers show only the body with a time stamp revealed on hover.
 */
export function MessageItem({
  message,
  showHeader,
  isOwn,
  canModify = true,
  onEdit,
  onDelete,
}: {
  message: ChatMessage;
  showHeader: boolean;
  isOwn: boolean;
  /** Whether edit/delete actions are available (false for DMs). */
  canModify?: boolean;
  onEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const authorName = message.author.name ?? message.author.email ?? "Unknown";
  const failed = message.sendState === "failed";
  const sending = message.sendState === "sending";
  // Own messages can be acted on, but not while still an optimistic placeholder.
  const canAct =
    canModify && isOwn && !editing && message.sendState !== "sending" && !failed;

  return (
    <div
      className={cn(
        "group relative flex gap-3 px-4 py-0.5 transition-colors hover:bg-surface/40",
        showHeader && "mt-2",
      )}
    >
      {/* Gutter: avatar for group leaders, hover time for followers. */}
      <div className="w-10 shrink-0">
        {showHeader ? (
          <Avatar user={message.author} />
        ) : (
          <span className="mt-1 hidden select-none text-right text-[10px] leading-4 text-text-muted group-hover:block">
            {gutterTime(message.createdAt)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {showHeader && (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-text">
              {authorName}
            </span>
            <span
              className="text-xs text-text-muted"
              title={fullTimestamp(message.createdAt)}
            >
              {relativeTime(message.createdAt)}
            </span>
            {message.editedAt && (
              <span className="text-xs text-text-muted">(edited)</span>
            )}
          </div>
        )}

        {editing ? (
          <EditForm
            initial={message.body}
            onSave={(body) => {
              onEdit(message.id, body);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div className={cn(sending && "opacity-60", failed && "opacity-80")}>
            <Markdown>{message.body}</Markdown>
            {!showHeader && message.editedAt && (
              <span className="ml-1 align-baseline text-xs text-text-muted">
                (edited)
              </span>
            )}
            {/* Read receipts show only on the author's own, confirmed sends. */}
            {isOwn && !sending && !failed && (
              <span className="ml-1 align-baseline">
                <ReadReceipt status={message.status} />
              </span>
            )}
          </div>
        )}

        {failed && (
          <p className="mt-0.5 text-xs text-danger">
            Failed to send. Check your connection and try again.
          </p>
        )}
      </div>

      {canAct && (
        <HoverActions
          onEdit={() => setEditing(true)}
          onDelete={() => {
            if (
              typeof window === "undefined" ||
              window.confirm("Delete this message?")
            ) {
              onDelete(message.id);
            }
          }}
        />
      )}
    </div>
  );
}
