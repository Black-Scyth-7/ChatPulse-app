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
const MAX_TEXTAREA_HEIGHT = 132;

/**
 * Message composer: an auto-expanding textarea (up to ~5 lines) with
 * Enter-to-send / Shift+Enter-for-newline, a send button that disables on an
 * empty draft, a character counter near the limit, and typing-indicator
 * signalling (start on keystroke, stop after 3s idle or on send).
 */
export function MessageInput({
  channelName,
  placeholder,
  disabled,
  onSend,
  onTypingStart,
  onTypingStop,
}: {
  channelName: string;
  /** Override the composer placeholder; defaults to `Message #<channelName>`. */
  placeholder?: string;
  disabled?: boolean;
  onSend: (body: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingRef = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmed = value.trim();
  const canSend = trimmed.length > 0 && trimmed.length <= MAX_LENGTH;
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
    <div className="shrink-0 border-t border-border px-4 py-3">
      <div className="flex items-end gap-2 rounded-lg border border-border-strong bg-surface-inset px-3 py-2 focus-within:border-accent">
        <textarea
          ref={textareaRef}
          value={value}
          rows={1}
          disabled={disabled}
          placeholder={placeholder ?? `Message #${channelName}`}
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
          className="max-h-[132px] min-h-[24px] flex-1 resize-none bg-transparent text-base text-text placeholder:text-text-muted focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={send}
          disabled={!canSend || disabled}
          aria-label="Send message"
          className={cn(
            "mb-0.5 shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-fast",
            canSend && !disabled
              ? "bg-accent text-accent-fg hover:bg-accent-hover"
              : "cursor-not-allowed bg-surface-raised text-text-muted",
          )}
        >
          Send
        </button>
      </div>
      <div className="mt-1 flex items-center justify-between px-1">
        <span className="text-xs text-text-muted">
          <span className="font-medium">Enter</span> to send ·{" "}
          <span className="font-medium">Shift+Enter</span> for a new line
        </span>
        {value.length > COUNT_THRESHOLD && (
          <span
            className={cn(
              "text-xs",
              overLimit ? "text-danger" : "text-text-muted",
            )}
          >
            {value.length}/{MAX_LENGTH}
          </span>
        )}
      </div>
    </div>
  );
}
