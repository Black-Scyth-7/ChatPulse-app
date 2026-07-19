"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getDesktop } from "./desktop";
import {
  ensureBrowserPermission,
  loadNotificationMode,
  saveNotificationMode,
  type NotificationMode,
} from "./notifications";

export interface NotificationSettings {
  /** Current preference: all messages, DMs only, or muted. */
  mode: NotificationMode;
  /** Update the preference (persists + mirrors to the Electron tray). */
  setMode: (mode: NotificationMode) => void;
}

const NotificationSettingsContext = createContext<NotificationSettings | null>(
  null,
);

/**
 * Shares the notification preference across the app so every consumer (the
 * settings menu that changes it and the message listener that reads it) sees
 * one value. State is hydrated from localStorage and kept in sync with the
 * Electron tray's "Mute notifications" checkbox in both directions:
 *  - Changing the mode persists it and calls `desktop.setMuted`.
 *  - Toggling mute from the tray flips us to/from "muted", restoring the last
 *    non-muted mode when unmuted.
 *
 * On mount (when not muted) it also requests browser notification permission so
 * the first real message can actually raise a toast.
 */
export function NotificationSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setModeState] = useState<NotificationMode>("all");
  // Remember the last non-muted choice so a tray "unmute" can restore it.
  const lastNonMutedRef = useRef<NotificationMode>("all");

  // Hydrate from storage on mount (avoids SSR/client markup mismatch).
  useEffect(() => {
    const initial = loadNotificationMode();
    setModeState(initial);
    if (initial !== "muted") {
      lastNonMutedRef.current = initial;
      void ensureBrowserPermission();
    }
    // Mirror the persisted preference to the tray checkbox at launch.
    void getDesktop()?.setMuted(initial === "muted");
  }, []);

  const setMode = useCallback((next: NotificationMode) => {
    setModeState(next);
    if (next !== "muted") {
      lastNonMutedRef.current = next;
      void ensureBrowserPermission();
    }
    saveNotificationMode(next);
  }, []);

  // Mirror tray mute toggles back into our tri-state preference.
  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop) return;
    const unsubscribe = desktop.onMuteChanged((muted) => {
      setModeState((current) => {
        if (muted) return "muted";
        // Unmuting from the tray: fall back to the last explicit non-muted mode.
        return current === "muted" ? lastNonMutedRef.current : current;
      });
    });
    return unsubscribe;
  }, []);

  return (
    <NotificationSettingsContext.Provider value={{ mode, setMode }}>
      {children}
    </NotificationSettingsContext.Provider>
  );
}

export function useNotificationSettings(): NotificationSettings {
  const ctx = useContext(NotificationSettingsContext);
  if (!ctx) {
    throw new Error(
      "useNotificationSettings must be used within a <NotificationSettingsProvider>",
    );
  }
  return ctx;
}
