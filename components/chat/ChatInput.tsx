"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

/** Hard message length limit (matches the server-side validator's intent). */
const MAX_LENGTH = 2000;
/** Show the character counter once the draft gets close to the limit. */
const COUNT_THRESHOLD = 1800;
/** Idle time after the last keystroke before we emit typing:stop. */
const TYPING_IDLE_MS = 3000;
/** Roughly five lines of the composer textarea before it starts scrolling. */
const MAX_TEXTAREA_HEIGHT = 120;

/**
 * A small, dependency-light set of common emoji for the composer picker. Kept
 * curated (rather than pulling a full unicode database) so the bundle stays lean.
 */
const EMOJI: readonly string[] = [
  "😀", "😂", "🙂", "😉", "😍", "😘", "😎", "🤔",
  "😴", "😭", "😡", "🥳", "😅", "😇", "🤗", "🤩",
  "👍", "👎", "👌", "🙏", "👏", "🙌", "💪", "🤝",
  "❤️", "🔥", "🎉", "✨", "⭐", "💯", "✅", "❌",
  "👀", "🚀", "☕", "🍕", "🎂", "😢", "😱", "🤣",
];

/** Smiley emoji glyph — opens the emoji picker. */
function EmojiIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="8.5" cy="10" r="1.15" fill="currentColor" />
      <circle cx="15.5" cy="10" r="1.15" fill="currentColor" />
      <path
        d="M8 14.5a5 5 0 0 0 8 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Send arrow glyph shown on the send button. */
function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M3.4 20.4 21 12 3.4 3.6 3.39 10.3 15.5 12l-12.11 1.7z" />
    </svg>
  );
}

/**
 * WhatsApp-style composer: a dark input bar pinned to the bottom of the chat.
 * The center is a rounded field with an emoji button (opens a lightweight picker
 * that inserts the chosen emoji at the cursor) and an auto-expanding textarea
 * (1–5 lines); the right is a green circular send button, enabled once the draft
 * has sendable text. Enter sends, Shift+Enter inserts a newline, a character
 * counter appears near the limit, and typing-indicator signals fire on keystroke
 * / stop after 3s idle or on send.
 */
export function ChatInput({
  placeholder,
  disabled,
  focusKey,
  onSend,
  onTypingStart,
  onTypingStop,
}: {
  /** Override the composer placeholder; defaults to "Type a message". */
  placeholder?: string;
  disabled?: boolean;
  /**
   * Changing this value re-focuses the composer — pass the channel/conversation
   * id so navigating between conversations lands the cursor in the input.
   */
  focusKey?: string;
  onSend: (body: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
}) {
  const [value, setValue] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cursor offset to restore after an emoji is spliced into the draft.
  const pendingCursor = useRef<number | null>(null);

  const trimmed = value.trim();
  const hasText = trimmed.length > 0;
  const canSend = hasText && trimmed.length <= MAX_LENGTH;
  const overLimit = value.length > MAX_LENGTH;

  // Auto-resize the textarea to fit its content, capped at MAX_TEXTAREA_HEIGHT.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [value]);

  // After inserting an emoji, drop the caret just past it and refocus.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (pendingCursor.current == null || !el) return;
    const pos = pendingCursor.current;
    pendingCursor.current = null;
    el.focus({ preventScroll: true });
    el.setSelectionRange(pos, pos);
  }, [value]);

  const stopTyping = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
    if (typingRef.current) {
      typingRef.current = false;
      onTypingStop();
    }
  }, [onTypingStop]);

  // Clean up the typing signal if the composer unmounts mid-type.
  useEffect(() => stopTyping, [stopTyping]);

  // Auto-focus the composer on mount and whenever the conversation changes, so
  // switching channels/DMs lands the cursor ready to type. Skipped when the
  // composer is disabled (nothing to type into).
  useEffect(() => {
    if (disabled) return;
    textareaRef.current?.focus({ preventScroll: true });
  }, [focusKey, disabled]);

  // Close the emoji picker on outside click or Escape.
  useEffect(() => {
    if (!emojiOpen) return;
    const onDown = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEmojiOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [emojiOpen]);

  const signalTyping = useCallback(() => {
    if (!typingRef.current) {
      typingRef.current = true;
      onTypingStart();
    }
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  }, [onTypingStart, stopTyping]);

  // Splice an emoji into the draft at the current caret (or selection), then
  // queue the caret to land just after it.
  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + emoji + value.slice(end);
    setValue(next);
    pendingCursor.current = start + emoji.length;
    setEmojiOpen(false);
    if (next.trim()) signalTyping();
  };

  const send = () => {
    if (!canSend || disabled) return;
    onSend(trimmed);
    setValue("");
    stopTyping();
  };

  return (
    <div className="shrink-0 bg-header px-3 py-2.5">
      <div className="flex items-end gap-1.5">
        {/* Center: rounded field with an emoji button + picker and the textarea. */}
        <div className="flex flex-1 items-end gap-1 rounded-lg bg-surface px-2 py-1.5">
          <div ref={emojiRef} className="relative shrink-0">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setEmojiOpen((v) => !v)}
              aria-haspopup="dialog"
              aria-expanded={emojiOpen}
              aria-label="Emoji"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors duration-fast hover:text-text focus:outline-none focus-visible:shadow-focus disabled:opacity-50",
                emojiOpen && "text-text",
              )}
            >
              <EmojiIcon />
            </button>

            {emojiOpen && (
              <div
                role="dialog"
                aria-label="Choose an emoji"
                className="absolute bottom-full left-0 z-dropdown mb-2 w-64 rounded-md border border-border bg-surface-overlay p-2 shadow-md"
              >
                <div className="grid grid-cols-8 gap-0.5">
                  {EMOJI.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      aria-label={`Insert ${emoji}`}
                      className="flex h-8 w-8 items-center justify-center rounded text-xl leading-none transition-colors duration-fast hover:bg-surface-raised focus:outline-none focus-visible:bg-surface-raised"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <textarea
            ref={textareaRef}
            value={value}
            rows={1}
            disabled={disabled}
            placeholder={placeholder ?? "Type a message"}
            onChange={(e) => {
              setValue(e.target.value);
              if (e.target.value.trim()) signalTyping();
              else stopTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            onBlur={stopTyping}
            className="max-h-[120px] min-h-[24px] flex-1 resize-none self-center bg-transparent py-1 text-base text-text placeholder:text-text-muted focus:outline-none disabled:opacity-50"
          />
        </div>

        {/* Right: green circular send button, enabled once the draft is sendable. */}
        <button
          type="button"
          onClick={send}
          disabled={disabled || !canSend}
          aria-label="Send message"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg transition-colors duration-fast hover:bg-accent-hover focus:outline-none focus-visible:shadow-focus disabled:opacity-50"
        >
          <SendIcon />
        </button>
      </div>

      {value.length > COUNT_THRESHOLD && (
        <div className="mt-1 flex justify-end px-1">
          <span
            className={cn("text-xs", overLimit ? "text-danger" : "text-text-muted")}
          >
            {value.length}/{MAX_LENGTH}
          </span>
        </div>
      )}
    </div>
  );
}
