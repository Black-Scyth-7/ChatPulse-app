"use client";

import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/lib/useSocket";

/** Auto-expire a typing state after this long, in case a stop event is lost. */
const TYPING_TIMEOUT_MS = 5000;

/**
 * Live "… is typing" line shown just below the message list. Subscribes to
 * `typing:update` for the channel, resolves user ids to display names, and
 * self-heals if a stop event never arrives by expiring each user after 5s.
 */
export function TypingIndicator({
  channelId,
  currentUserId,
  resolveName,
}: {
  channelId: string;
  currentUserId: string;
  resolveName: (userId: string) => string;
}) {
  const { on, off } = useSocket();
  const [typingIds, setTypingIds] = useState<string[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const clearTimer = (userId: string) => {
      const t = timers.current.get(userId);
      if (t) {
        clearTimeout(t);
        timers.current.delete(userId);
      }
    };
    const remove = (userId: string) => {
      clearTimer(userId);
      setTypingIds((prev) => prev.filter((id) => id !== userId));
    };

    const onTyping = (data: {
      channelId: string;
      userId: string;
      isTyping: boolean;
    }) => {
      if (data.channelId !== channelId || data.userId === currentUserId) return;
      if (data.isTyping) {
        setTypingIds((prev) =>
          prev.includes(data.userId) ? prev : [...prev, data.userId],
        );
        clearTimer(data.userId);
        timers.current.set(
          data.userId,
          setTimeout(() => remove(data.userId), TYPING_TIMEOUT_MS),
        );
      } else {
        remove(data.userId);
      }
    };

    on("typing:update", onTyping);
    const active = timers.current;
    return () => {
      off("typing:update", onTyping);
      active.forEach((t) => clearTimeout(t));
      active.clear();
    };
  }, [channelId, currentUserId, on, off]);

  // Reset when navigating to a different channel.
  useEffect(() => {
    setTypingIds([]);
  }, [channelId]);

  if (typingIds.length === 0) {
    // Reserve the row height so the composer doesn't jump when typing starts.
    return <div className="h-5" aria-hidden="true" />;
  }

  const names = typingIds.map(resolveName);
  let text: string;
  if (names.length === 1) {
    text = `${names[0]} is typing…`;
  } else if (names.length === 2) {
    text = `${names[0]} and ${names[1]} are typing…`;
  } else if (names.length === 3) {
    text = `${names[0]}, ${names[1]} and ${names[2]} are typing…`;
  } else {
    text = "Several people are typing…";
  }

  return (
    <div
      className="h-5 truncate px-4 text-xs italic text-text-secondary"
      aria-live="polite"
    >
      {text}
    </div>
  );
}
