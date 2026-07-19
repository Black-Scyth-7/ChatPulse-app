/**
 * Notification engine for new-message alerts, shared by the browser and the
 * Electron desktop shell.
 *
 * Responsibilities:
 *  - Persist the user's notification preference (all / DMs only / muted) in
 *    localStorage, mirrored to the Electron tray mute state when in the shell.
 *  - Raise a native OS notification via `window.desktop` inside Electron, or the
 *    web `Notification` API in a plain browser.
 *  - Play a short chime, respecting the mute setting.
 *
 * Detection follows the ticket: `window.desktop` (our preload bridge) present →
 * desktop; otherwise fall back to the browser Notification API.
 */
import { getDesktop } from "./desktop";

/** How much of a conversation to notify about. */
export type NotificationMode = "all" | "dm" | "muted";

export const NOTIFICATION_MODES: NotificationMode[] = ["all", "dm", "muted"];

export const NOTIFICATION_MODE_LABEL: Record<NotificationMode, string> = {
  all: "All messages",
  dm: "Direct messages only",
  muted: "Muted",
};

const STORAGE_KEY = "chatpulse:notification-mode";

/** Read the persisted mode (defaults to "all"); SSR-safe. */
export function loadNotificationMode(): NotificationMode {
  if (typeof window === "undefined") return "all";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "all" || raw === "dm" || raw === "muted" ? raw : "all";
}

/** Persist the mode and mirror it to the Electron tray mute checkbox. */
export function saveNotificationMode(mode: NotificationMode): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, mode);
  }
  // Keep the tray "Mute notifications" checkbox in sync with our tri-state.
  void getDesktop()?.setMuted(mode === "muted");
}

/**
 * Whether a message of the given conversation type should notify under `mode`.
 * `muted` suppresses everything; `dm` allows only direct messages.
 */
export function shouldNotify(
  mode: NotificationMode,
  type: "channel" | "dm",
): boolean {
  if (mode === "muted") return false;
  if (mode === "dm") return type === "dm";
  return true;
}

/**
 * Ask for browser notification permission if it hasn't been decided yet.
 * No-op in the desktop shell (native notifications need no page permission) and
 * when the API is unavailable. Safe to call repeatedly.
 */
export async function ensureBrowserPermission(): Promise<void> {
  if (getDesktop()) return;
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch {
      // User dismissed or the browser blocked it; nothing more we can do.
    }
  }
}

export interface ShowNotificationInput {
  title: string;
  body: string;
  /** Sender avatar URL, used as the notification icon. */
  icon?: string;
  /** In-app route to open on click (e.g. `/dm/123` or `/channel/abc`). */
  navigatePath: string;
  /** Called (browser path) when the notification is clicked. */
  onActivate: (navigatePath: string) => void;
}

/**
 * Raise a native notification. Uses the Electron bridge when present, else the
 * web Notification API. In the browser, clicking focuses the window and invokes
 * `onActivate`; in Electron the main process handles the click and forwards the
 * route via `desktop.onActivate` (wired up by the caller).
 */
export function showNotification(input: ShowNotificationInput): void {
  const desktop = getDesktop();
  if (desktop) {
    void desktop.notify({
      title: input.title,
      body: input.body,
      icon: input.icon,
      navigatePath: input.navigatePath,
    });
    return;
  }

  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const notification = new Notification(input.title, {
      body: input.body,
      icon: input.icon,
      // Collapse repeat alerts for the same conversation into one toast.
      tag: input.navigatePath,
    });
    notification.onclick = () => {
      window.focus();
      input.onActivate(input.navigatePath);
      notification.close();
    };
  } catch {
    // Some browsers throw if constructed without an active service worker;
    // the in-app unread badges still convey the message, so fail quietly.
  }
}

// --- Sound ----------------------------------------------------------------

let audioEl: HTMLAudioElement | null = null;

/**
 * Play the notification chime. Prefers the bundled asset and falls back to a
 * synthesized two-tone beep (Web Audio) if the file can't be played — e.g. it
 * failed to load. A no-op during SSR.
 */
export function playNotificationSound(): void {
  if (typeof window === "undefined") return;
  try {
    if (!audioEl) {
      audioEl = new Audio("/sounds/notification.wav");
      audioEl.preload = "auto";
    }
    audioEl.currentTime = 0;
    const played = audioEl.play();
    if (played && typeof played.catch === "function") {
      played.catch(() => synthBeep());
    }
  } catch {
    synthBeep();
  }
}

/** Last-resort chime synthesized in-process, so a missing asset is never silent. */
function synthBeep(): void {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const now = ctx.currentTime;
    for (const [freq, at] of [
      [880, 0],
      [1174.66, 0.09],
    ] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.25, now + at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.24);
    }
    // Release the context shortly after the tone finishes.
    setTimeout(() => void ctx.close().catch(() => {}), 600);
  } catch {
    // Audio is unavailable (autoplay policy, no device); ignore.
  }
}
