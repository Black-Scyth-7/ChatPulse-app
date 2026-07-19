/**
 * Renderer-side view of the Electron preload bridge (`window.desktop`).
 *
 * The desktop shell (electron/preload.ts) exposes a frozen `window.desktop`
 * object when — and only when — ChatPulse runs inside Electron. In a plain
 * browser it is `undefined`, which is how feature code decides between native
 * OS notifications and the web `Notification` API.
 *
 * This mirrors the `DesktopBridge` shape defined in the preload so renderer
 * code (which is compiled by Next, separately from the Electron tsconfig) has a
 * type for it without importing across the process boundary.
 */

/** Payload for a native OS notification raised through the desktop shell. */
export interface DesktopNotifyPayload {
  title: string;
  body: string;
  /** Absolute URL of the sender's avatar, shown as the notification icon. */
  icon?: string;
  /** In-app route to open when the notification is clicked (e.g. `/dm/123`). */
  navigatePath?: string;
}

export interface DesktopBridge {
  isDesktop: true;
  notify(payload: DesktopNotifyPayload): Promise<boolean>;
  setBadgeCount(count: number): Promise<boolean>;
  setMuted(muted: boolean): Promise<boolean>;
  getMuted(): Promise<boolean>;
  showWindow(): Promise<boolean>;
  setAutoStart(enabled: boolean): Promise<boolean>;
  getAutoStart(): Promise<boolean>;
  /** Subscribe to mute changes made from the tray; returns an unsubscribe fn. */
  onMuteChanged(listener: (muted: boolean) => void): () => void;
  /**
   * Fired when the user clicks a native notification: carries the in-app route
   * to navigate to. Returns an unsubscribe fn.
   */
  onActivate(listener: (navigatePath: string) => void): () => void;
}

declare global {
  interface Window {
    desktop?: DesktopBridge;
  }
}

/** The desktop bridge if running inside Electron, else `null` (browser/SSR). */
export function getDesktop(): DesktopBridge | null {
  if (typeof window === "undefined") return null;
  return window.desktop ?? null;
}

/** True when ChatPulse is running inside the Electron desktop shell. */
export function isDesktop(): boolean {
  return getDesktop() !== null;
}
