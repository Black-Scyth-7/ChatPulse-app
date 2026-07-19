"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/useChatMessages";
import type { MessageStatus } from "@/lib/types";
import { Markdown } from "./Markdown";

/**
 * Palette for sender-name labels in group chats. Chosen to stay legible on the
 * dark incoming bubble (#1F2C34); one color is assigned per user, stable across
 * renders and sessions via a hash of the user id.
 */
const NAME_COLORS = [
  "#53BDEB",
  "#00A884",
  "#E6B14C",
  "#F15C6D",
  "#7F66FF",
  "#35CD96",
  "#E542A3",
  "#6BCBEF",
  "#F0616D",
  "#A9C99D",
  "#D3843A",
  "#C99DF0",
];

/** Deterministic per-user color for the group-chat sender name. */
function senderColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return NAME_COLORS[Math.abs(hash) % NAME_COLORS.length] ?? NAME_COLORS[0]!;
}

/** Compact time-of-day stamp shown inside the bubble, e.g. "3:04 PM". */
function bubbleTime(iso: string): string {
  return format(new Date(iso), "p");
}

/** Full timestamp for the hover title, e.g. "Jul 16, 2026, 3:04 PM". */
function fullTimestamp(iso: string): string {
  return format(new Date(iso), "PPp");
}

/**
 * WhatsApp-style read-receipt ticks for the author's own messages:
 * SENT → single gray check, DELIVERED → double gray check, READ → double blue.
 */
function ReadReceipt({ status }: { status: MessageStatus }) {
  const label =
    status === "READ" ? "Read" : status === "DELIVERED" ? "Delivered" : "Sent";
  return (
    <span
      className={cn(
        "inline-flex select-none text-tick leading-none",
        status === "READ" ? "text-tick-read" : "text-tick",
      )}
      title={label}
      aria-label={label}
    >
      {status === "SENT" ? "✓" : "✓✓"}
    </span>
  );
}

type MenuAction = "edit" | "delete" | "copy";

/**
 * Context menu opened by right-click (desktop) or long-press (touch). Renders
 * fixed at the pointer position and closes on outside click, scroll, or Escape.
 */
function ContextMenu({
  x,
  y,
  canModify,
  onAction,
  onClose,
}: {
  x: number;
  y: number;
  canModify: boolean;
  onAction: (action: MenuAction) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onClose, true);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  // Keep the menu on-screen when opened near the right/bottom edges.
  const left = typeof window !== "undefined" ? Math.min(x, window.innerWidth - 160) : x;
  const top = typeof window !== "undefined" ? Math.min(y, window.innerHeight - 140) : y;

  return (
    <div
      ref={ref}
      role="menu"
      style={{ left, top }}
      className="fixed z-dropdown min-w-[140px] overflow-hidden rounded-md border border-border bg-surface-overlay py-1 shadow-md"
    >
      {canModify && (
        <button
          type="button"
          role="menuitem"
          onClick={() => onAction("edit")}
          className="block w-full px-3 py-1.5 text-left text-sm text-text transition-colors duration-fast hover:bg-surface-raised focus:outline-none focus-visible:bg-surface-raised"
        >
          Edit
        </button>
      )}
      <button
        type="button"
        role="menuitem"
        onClick={() => onAction("copy")}
        className="block w-full px-3 py-1.5 text-left text-sm text-text transition-colors duration-fast hover:bg-surface-raised focus:outline-none focus-visible:bg-surface-raised"
      >
        Copy
      </button>
      {canModify && (
        <button
          type="button"
          role="menuitem"
          onClick={() => onAction("delete")}
          className="block w-full px-3 py-1.5 text-left text-sm text-danger transition-colors duration-fast hover:bg-danger-muted focus:outline-none focus-visible:bg-danger-muted"
        >
          Delete
        </button>
      )}
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
    <div className="min-w-[12rem]">
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
        className="w-full resize-none rounded-md border border-border-strong bg-surface-inset px-2 py-1.5 text-base text-text outline-none focus:border-accent"
      />
      <div className="mt-1 flex items-center gap-2 text-tick text-text-secondary">
        <button
          type="button"
          onClick={submit}
          className="rounded bg-accent px-2 py-0.5 font-medium text-accent-fg hover:bg-accent-hover"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-2 py-0.5 hover:text-text"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * A single WhatsApp-style chat bubble. Own messages are right-aligned in the
 * teal outgoing color; others are left-aligned in the gray incoming color. The
 * first message of a run (`showTail`) grows a tail on its outer bottom corner
 * and, in group chats, a colored sender name; grouped followers tuck in tighter.
 */
export function ChatBubble({
  message,
  isOwn,
  isGroup,
  showTail,
  canModify = true,
  onEdit,
  onDelete,
  onRetry,
}: {
  message: ChatMessage;
  isOwn: boolean;
  /** Group chat (channel) — enables the sender-name label on incoming bubbles. */
  isGroup: boolean;
  /** First message of a visual run: draws the tail (and sender name if group). */
  showTail: boolean;
  /** Whether edit/delete are available (false for DMs). */
  canModify?: boolean;
  onEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
  /** Re-send a failed optimistic message, keyed by its clientId. */
  onRetry?: (clientId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const authorName = message.author.name ?? message.author.email ?? "Unknown";
  const failed = message.sendState === "failed";
  const sending = message.sendState === "sending";
  // Own, confirmed messages can be edited/deleted; optimistic ones cannot.
  const canAct = canModify && isOwn && !sending && !failed;
  const showSenderName = isGroup && !isOwn && showTail;

  const openMenu = (x: number, y: number) => {
    if (editing) return;
    setMenu({ x, y });
  };

  const handleAction = (action: MenuAction) => {
    setMenu(null);
    if (action === "copy") {
      void navigator.clipboard?.writeText(message.body);
    } else if (action === "edit") {
      setEditing(true);
    } else if (action === "delete") {
      if (
        typeof window === "undefined" ||
        window.confirm("Delete this message?")
      ) {
        onDelete(message.id);
      }
    }
  };

  const clearLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  return (
    <div
      className={cn(
        "flex px-4",
        isOwn ? "justify-end" : "justify-start",
        // Tighter 2px gap between grouped messages; 8px when a new run starts.
        showTail ? "mt-2" : "mt-0.5",
      )}
    >
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          openMenu(e.clientX, e.clientY);
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (!t) return;
          const { clientX, clientY } = t;
          clearLongPress();
          longPressRef.current = setTimeout(
            () => openMenu(clientX, clientY),
            500,
          );
        }}
        onTouchEnd={clearLongPress}
        onTouchMove={clearLongPress}
        className={cn(
          "relative max-w-bubble rounded-bubble px-2 py-1.5 shadow-sm",
          isOwn ? "bg-bubble-out" : "bg-bubble-in",
          // Square off the corner where the tail attaches.
          showTail && (isOwn ? "rounded-br-none" : "rounded-bl-none"),
          sending && "opacity-60",
          failed && "opacity-80",
        )}
      >
        {/* Bubble tail on the outer bottom corner of the first message in a run. */}
        {showTail &&
          (isOwn ? (
            <span
              aria-hidden="true"
              className="absolute bottom-0 right-[-8px] h-0 w-0 border-b-[8px] border-l-[8px] border-b-transparent border-l-bubble-out"
            />
          ) : (
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-[-8px] h-0 w-0 border-b-[8px] border-r-[8px] border-b-transparent border-r-bubble-in"
            />
          ))}

        {showSenderName && (
          <div
            className="mb-0.5 text-sm font-semibold leading-tight"
            style={{ color: senderColor(message.authorId) }}
          >
            {authorName}
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
          <>
            <Markdown>{message.body}</Markdown>
            <div className="mt-0.5 flex items-center justify-end gap-1 leading-none">
              {message.editedAt && (
                <span className="text-tick text-text-secondary">edited</span>
              )}
              <span
                className="select-none text-tick text-text-secondary"
                title={fullTimestamp(message.createdAt)}
              >
                {bubbleTime(message.createdAt)}
              </span>
              {/* Read receipts show only on the author's own, confirmed sends. */}
              {isOwn && !sending && !failed && (
                <ReadReceipt status={message.status} />
              )}
            </div>
            {failed && (
              <button
                type="button"
                onClick={() => {
                  if (message.clientId) onRetry?.(message.clientId);
                }}
                className="mt-0.5 block text-left text-tick text-danger underline decoration-dotted underline-offset-2 transition-opacity duration-fast hover:opacity-80 focus:outline-none focus-visible:shadow-focus"
              >
                Failed to send. Tap to retry.
              </button>
            )}
          </>
        )}
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          canModify={canAct}
          onAction={handleAction}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
