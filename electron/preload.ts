/**
 * Preload bridge for the ChatPulse desktop shell.
 *
 * Runs in an isolated context (contextIsolation: true) with no Node access in
 * the page. It exposes a single, frozen `window.desktop` object whose methods
 * forward to the vetted IPC channels handled in main.ts. The renderer can use
 * these to raise native notifications, update the taskbar badge, toggle the
 * tray mute state, and manage auto-start — nothing more.
 */
import { contextBridge, ipcRenderer } from "electron";

export interface DesktopBridge {
  /** True inside the Electron shell; lets web code feature-detect the desktop. */
  isDesktop: true;
  /** Raise a native OS notification (suppressed while muted). Returns shown. */
  notify(payload: {
    title: string;
    body: string;
    /** URL of the sender's avatar, shown as the notification icon. */
    icon?: string;
    /** In-app route to open when the notification is clicked. */
    navigatePath?: string;
  }): Promise<boolean>;
  /** Set the unread badge on the taskbar/dock and tray tooltip. */
  setBadgeCount(count: number): Promise<boolean>;
  /** Mute/unmute notifications; kept in sync with the tray checkbox. */
  setMuted(muted: boolean): Promise<boolean>;
  /** Current mute state (e.g. after the user toggled it from the tray). */
  getMuted(): Promise<boolean>;
  /** Bring the window to the foreground. */
  showWindow(): Promise<boolean>;
  /** Launch ChatPulse on OS login (packaged installs only). */
  setAutoStart(enabled: boolean): Promise<boolean>;
  /** Whether launch-on-login is currently enabled. */
  getAutoStart(): Promise<boolean>;
  /** Subscribe to mute changes made from the tray; returns an unsubscribe fn. */
  onMuteChanged(listener: (muted: boolean) => void): () => void;
  /**
   * Fired when the user clicks a native notification: carries the in-app route
   * to navigate to. Returns an unsubscribe fn.
   */
  onActivate(listener: (navigatePath: string) => void): () => void;
}

const bridge: DesktopBridge = {
  isDesktop: true,
  notify: (payload) => ipcRenderer.invoke("desktop:notify", payload),
  setBadgeCount: (count) => ipcRenderer.invoke("desktop:set-badge", count),
  setMuted: (muted) => ipcRenderer.invoke("desktop:set-muted", muted),
  getMuted: () => ipcRenderer.invoke("desktop:get-muted"),
  showWindow: () => ipcRenderer.invoke("desktop:show-window"),
  setAutoStart: (enabled) => ipcRenderer.invoke("desktop:set-auto-start", enabled),
  getAutoStart: () => ipcRenderer.invoke("desktop:get-auto-start"),
  onMuteChanged: (listener) => {
    const handler = (_event: unknown, muted: boolean) => listener(muted);
    ipcRenderer.on("desktop:mute-changed", handler);
    return () => ipcRenderer.removeListener("desktop:mute-changed", handler);
  },
  onActivate: (listener) => {
    const handler = (_event: unknown, navigatePath: string) =>
      listener(navigatePath);
    ipcRenderer.on("desktop:activate", handler);
    return () => ipcRenderer.removeListener("desktop:activate", handler);
  },
};

contextBridge.exposeInMainWorld("desktop", bridge);
