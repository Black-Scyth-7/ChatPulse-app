"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { isNativePlatform } from "./capacitor";
import { hapticImpact } from "./haptics";

/**
 * Pull-to-refresh for a scrollable element on the Android app (CHAA-56).
 *
 * Attaches touch handlers to `scrollRef` and, when the user drags down while
 * already at the top, tracks a rubber-band pull. Releasing past a threshold
 * fires `onRefresh` (with a short haptic) and shows a spinner until it settles.
 *
 * Native-only: gated on `isNativePlatform()` and `enabled`, so the web/desktop
 * build attaches nothing and native scroll/mouse behaviour is untouched. The
 * returned `indicator` is an absolutely-positioned spinner the caller drops in
 * as the first child of the (position-relative) scroll container.
 */

/** Drag distance (px) past which a release triggers a refresh. */
const THRESHOLD = 64;
/** Clamp on the visual pull so the indicator can't be dragged arbitrarily far. */
const MAX_PULL = 96;
/** Rubber-band factor — the indicator moves at half the finger's speed. */
const RESISTANCE = 0.5;

interface PullToRefresh {
  /** Current pull distance in px (0 when idle). */
  pull: number;
  /** True while `onRefresh` is in flight. */
  refreshing: boolean;
  /** Spinner node; render as the first child of the relative scroll container. */
  indicator: React.ReactNode;
}

export function usePullToRefresh<T extends HTMLElement>(
  scrollRef: RefObject<T | null>,
  onRefresh: () => void | Promise<void>,
  enabled = true,
): PullToRefresh {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Refs mirror state/props so the touch listeners can stay registered once.
  const pullRef = useRef(0);
  const startY = useRef<number | null>(null);
  const refreshingRef = useRef(false);
  refreshingRef.current = refreshing;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const setPullBoth = (v: number) => {
    pullRef.current = v;
    setPull(v);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !enabled || !isNativePlatform()) return;

    const onStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (refreshingRef.current || e.touches.length !== 1 || !touch) {
        startY.current = null;
        return;
      }
      // Only begin a pull when already scrolled to the very top.
      startY.current = el.scrollTop <= 0 ? touch.clientY : null;
    };

    const onMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (startY.current === null || refreshingRef.current || !touch) return;
      const delta = touch.clientY - startY.current;
      // Dragging up, or scrolled back down mid-gesture — abandon the pull.
      if (delta <= 0 || el.scrollTop > 0) {
        if (pullRef.current !== 0) setPullBoth(0);
        return;
      }
      const dist = Math.min(delta * RESISTANCE, MAX_PULL);
      setPullBoth(dist);
      // Keep the page from over-scrolling while we own the gesture.
      if (dist > 4 && e.cancelable) e.preventDefault();
    };

    const onEnd = () => {
      if (startY.current === null) return;
      startY.current = null;
      if (pullRef.current >= THRESHOLD) {
        setRefreshing(true);
        setPullBoth(THRESHOLD);
        hapticImpact("light");
        void (async () => {
          try {
            await onRefreshRef.current();
          } finally {
            setRefreshing(false);
            setPullBoth(0);
          }
        })();
      } else {
        setPullBoth(0);
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [scrollRef, enabled]);

  const active = pull > 0 || refreshing;
  const indicator = active ? (
    <div
      aria-hidden={!refreshing}
      className="pointer-events-none absolute inset-x-0 top-0 z-dropdown flex justify-center"
      style={{
        transform: `translateY(${Math.max(pull - 24, 4)}px)`,
        opacity: refreshing ? 1 : Math.min(pull / THRESHOLD, 1),
      }}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-overlay shadow-md">
        <span
          className={
            "block h-4 w-4 rounded-full border-2 border-text-muted border-t-accent" +
            (refreshing ? " animate-spin" : "")
          }
          style={refreshing ? undefined : { transform: `rotate(${pull * 3}deg)` }}
        />
      </span>
    </div>
  ) : null;

  return { pull, refreshing, indicator };
}
