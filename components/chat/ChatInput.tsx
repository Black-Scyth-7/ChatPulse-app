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

/** Paperclip attachment glyph. */
function AttachIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path
        d="M16.5 6.5 8.9 14.1a2.12 2.12 0 0 0 3 3l7.6-7.6a4.24 4.24 0 0 0-6-6L5.4 11.6a6.36 6.36 0 0 0 9 9l6.7-6.7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Smiley emoji glyph (opens no picker yet — placeholder). */
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

/** Microphone glyph shown when the draft is empty (placeholder, non-functional). */
function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <rect
        x="9"
        y="3"
        width="6"
        height="11"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Send arrow glyph shown when the draft has text. */
function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M3.4 20.4 21 12 3.4 3.6 3.39 10.3 15.5 12l-12.11 1.7z" />
    </svg>
  );
}

/** Attachment options — placeholders; none of these do anything yet. */
const ATTACH_ITEMS = [
  { key: "document", label: "Document", icon: "📄" },
  { key: "photos", label: "Photos", icon: "🖼️" },
  { key: "camera", label: "Camera", icon: "📷" },
] as const;

/**
 * WhatsApp-style composer: a dark input bar pinned to the bottom of the chat.
 * Left is an attachment button opening a Document/Photos/Camera menu (all
 * placeholders); the center is a rounded field with an emoji glyph and an
 * auto-expanding textarea (1–5 lines); the right swaps a mic glyph (empty
 * draft) for a green circular send button (has text). Behaviour matches the
 * old composer: Enter sends, Shift+Enter inserts a newline, a character counter
 * appears near the limit, and typing-indicator signals fire on keystroke / stop
 * after 3s idle or on send.
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
  const [attachOpen, setAttachOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Close the attachment menu on outside click.
  useEffect(() => {
    if (!attachOpen) return;
    const onDown = (e: MouseEvent) => {
      if (attachRef.current && !attachRef.current.contains(e.target as Node)) {
        setAttachOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAttachOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [attachOpen]);

  const signalTyping = useCallback(() => {
    if (!typingRef.current) {
      typingRef.current = true;
      onTypingStart();
    }
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  }, [onTypingStart, stopTyping]);

  const send = () => {
    if (!canSend || disabled) return;
    onSend(trimmed);
    setValue("");
    stopTyping();
  };

  return (
    <div className="shrink-0 bg-header px-3 py-2.5">
      <div className="flex items-end gap-1.5">
        {/* Left: attachment button + placeholder menu. */}
        <div ref={attachRef} className="relative shrink-0">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setAttachOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={attachOpen}
            aria-label="Attach"
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full text-text-secondary transition-colors duration-fast hover:bg-surface-raised hover:text-text focus:outline-none focus-visible:shadow-focus disabled:opacity-50",
              attachOpen && "text-text",
            )}
          >
            <AttachIcon />
          </button>

          {attachOpen && (
            <div
              role="menu"
              className="absolute bottom-full left-0 z-dropdown mb-2 min-w-44 overflow-hidden rounded-md border border-border bg-surface-overlay py-1 shadow-md"
            >
              {ATTACH_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  onClick={() => setAttachOpen(false)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-text transition-colors duration-fast hover:bg-surface-raised focus:outline-none focus-visible:bg-surface-raised"
                >
                  <span aria-hidden="true" className="text-base leading-none">
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center: rounded field with an emoji glyph and the textarea. */}
        <div className="flex flex-1 items-end gap-1 rounded-lg bg-surface px-2 py-1.5">
          <button
            type="button"
            disabled={disabled}
            aria-label="Emoji"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors duration-fast hover:text-text focus:outline-none focus-visible:shadow-focus disabled:opacity-50"
          >
            <EmojiIcon />
          </button>
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

        {/* Right: mic (empty draft) ⇄ green send button (has text). */}
        <button
          type="button"
          onClick={send}
          disabled={disabled || (hasText && !canSend)}
          aria-label={hasText ? "Send message" : "Voice message"}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-fast focus:outline-none focus-visible:shadow-focus disabled:opacity-50",
            hasText
              ? "bg-accent text-accent-fg hover:bg-accent-hover"
              : "text-text-secondary hover:bg-surface-raised hover:text-text",
          )}
        >
          <span
            key={hasText ? "send" : "mic"}
            className="flex items-center justify-center transition-transform duration-fast"
          >
            {hasText ? <SendIcon /> : <MicIcon />}
          </span>
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
