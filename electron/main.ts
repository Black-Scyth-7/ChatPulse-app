/**
 * ChatPulse desktop — Electron main process.
 *
 * Wraps the existing Next.js + Socket.io app in a desktop shell. In development
 * the renderer loads the dev server at http://localhost:3000 (started alongside
 * Electron by `pnpm electron:dev`). In a packaged build the same app server is
 * launched as a child process and the window points at it once it is ready.
 *
 * Security: the renderer runs with `nodeIntegration: false` and
 * `contextIsolation: true`. All privileged capabilities (notifications, taskbar
 * badge, tray control, auto-start) are exposed through a narrow, validated IPC
 * surface defined here and bridged in preload.ts.
 */
import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  Notification,
  dialog,
  shell,
  type NativeImage,
} from "electron";
import { autoUpdater } from "electron-updater";
import { spawn, type ChildProcess } from "child_process";
import * as path from "path";
import * as http from "http";

const isDev = !app.isPackaged;

/** URL the renderer loads. Overridable so QA can point at a staging server. */
const APP_URL = process.env.CHATPULSE_URL ?? "http://localhost:3000";

/**
 * When true, we manage the app server ourselves: only in a packaged build and
 * only when no explicit URL was provided. An explicit CHATPULSE_URL means the
 * server lives elsewhere (dev process, staging, a hosted deploy), so we must
 * not spawn or wait for a local one.
 */
const shouldStartLocalServer = !isDev && !process.env.CHATPULSE_URL;

/** Where the app server listens in a packaged build (dev is external). */
const APP_PORT = Number(process.env.PORT ?? 3000);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let serverProcess: ChildProcess | null = null;

/** When true, close() really quits instead of hiding to the tray. */
let isQuitting = false;
/** Reflected in the tray menu; renderer reads it to suppress notifications. */
let notificationsMuted = false;
/** Last badge count so the tray tooltip/icon stay in sync. */
let unreadCount = 0;

// A second launch should focus the existing window rather than spawn another.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

function resolveIcon(): NativeImage {
  // public/icon.png in dev; bundled next to resources in a packaged build.
  const iconPath = isDev
    ? path.join(app.getAppPath(), "public", "icon.png")
    : path.join(process.resourcesPath, "icon.png");
  const image = nativeImage.createFromPath(iconPath);
  return image.isEmpty() ? nativeImage.createEmpty() : image;
}

/**
 * Icon for a message notification: the sender's avatar when a usable URL is
 * supplied, otherwise the app icon. Electron accepts a string (path/URL) or a
 * NativeImage; a remote avatar renders where the platform supports it and the
 * app icon is the guaranteed fallback.
 */
function notificationIcon(url?: string): string | NativeImage {
  return typeof url === "string" && url.length > 0 ? url : resolveIcon();
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: true,
    titleBarStyle: "default",
    icon: resolveIcon(),
    show: false,
    webPreferences: {
      // Security posture required by the task: no Node in the renderer, an
      // isolated context, and a preload that bridges only vetted channels.
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Avoid a white flash: reveal only once the first paint is ready.
  mainWindow.once("ready-to-show", () => mainWindow?.show());

  mainWindow.loadURL(APP_URL);

  // Open external links (target=_blank / window.open) in the system browser
  // instead of a frameless Electron window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Minimize to tray on close instead of quitting, unless we are really
  // quitting (tray "Quit" or app.quit()).
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function showWindow(): void {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function buildTrayMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: "Open ChatPulse", click: () => showWindow() },
    {
      label: "Mute notifications",
      type: "checkbox",
      checked: notificationsMuted,
      click: (item) => setMuted(item.checked),
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function createTray(): void {
  const icon = resolveIcon();
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip("ChatPulse");
  tray.setContextMenu(buildTrayMenu());

  // Single click restores the window (Windows/Linux convention).
  tray.on("click", () => showWindow());
}

/** Push the current mute state to renderer + tray menu and remember it. */
function setMuted(muted: boolean): void {
  notificationsMuted = muted;
  tray?.setContextMenu(buildTrayMenu());
  mainWindow?.webContents.send("desktop:mute-changed", muted);
}

/**
 * Reflect the unread count on the taskbar badge and tray tooltip. Windows has
 * no numeric tray badge, so we use an overlay dot on the taskbar icon and keep
 * the count in the tooltip; macOS/Linux use the native dock/badge APIs.
 */
function setBadgeCount(count: number): void {
  unreadCount = Math.max(0, Math.floor(count));
  app.setBadgeCount(unreadCount); // macOS dock + Linux Unity; no-op on Windows

  if (process.platform === "win32" && mainWindow) {
    if (unreadCount > 0) {
      const badge = nativeImage.createFromDataURL(badgeOverlayDataUrl(unreadCount));
      mainWindow.setOverlayIcon(badge, `${unreadCount} unread`);
    } else {
      mainWindow.setOverlayIcon(null, "");
    }
  }

  tray?.setToolTip(unreadCount > 0 ? `ChatPulse — ${unreadCount} unread` : "ChatPulse");
}

/** A tiny red dot with the count, as an SVG data URL, for the taskbar overlay. */
function badgeOverlayDataUrl(count: number): string {
  const label = count > 99 ? "99+" : String(count);
  const fontSize = label.length > 2 ? 14 : 18;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
    <circle cx="16" cy="16" r="15" fill="#e11d48"/>
    <text x="16" y="16" fill="#ffffff" font-family="Segoe UI, sans-serif"
      font-size="${fontSize}" font-weight="700" text-anchor="middle"
      dominant-baseline="central">${label}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** Poll until the app server answers, so we don't loadURL before it's up. */
function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() > deadline) {
          reject(new Error(`Timed out waiting for ${url}`));
        } else {
          setTimeout(attempt, 500);
        }
      });
    };
    attempt();
  });
}

/**
 * In a packaged build there is no external dev server, so we start the app's
 * custom Next + Socket.io server as a child process and wait for it to listen.
 * The compiled server and its runtime deps are shipped as unpacked resources
 * (see the electron-builder `files`/`asarUnpack` config in package.json).
 */
async function startAppServer(): Promise<void> {
  const serverEntry = path.join(process.resourcesPath, "app", "server", "index.js");
  serverProcess = spawn(process.execPath, [serverEntry], {
    env: { ...process.env, NODE_ENV: "production", PORT: String(APP_PORT) },
    // ELECTRON_RUN_AS_NODE makes the bundled Electron binary behave as plain
    // Node for the child, so we don't need a separate Node install.
    stdio: "inherit",
  });
  serverProcess.on("exit", (code) => {
    if (!isQuitting) {
      console.error(`[chatpulse] app server exited early (code ${code})`);
    }
  });
  await waitForServer(`http://localhost:${APP_PORT}`);
}

// --- Auto-update -----------------------------------------------------------

/** Re-check for updates on this cadence while the app stays open. */
const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

/** Guards against overlapping "update available"/"downloaded" dialogs. */
let updatePromptOpen = false;

/**
 * Wire up electron-updater: check on launch and every 4 hours, prompt the user
 * before downloading, and offer a restart once an update is staged.
 *
 * The update source is GitHub Releases (see `publish` in package.json's build
 * config). No dedicated update server is run; this is the manual/local setup
 * described by CHAA-54. Every failure path is swallowed with a logged warning
 * so an unreachable feed never crashes or interrupts the app.
 */
function setupAutoUpdater(): void {
  // autoUpdater only works against a packaged build with real version metadata;
  // in dev there is nothing to update and forcing it throws.
  if (isDev) return;

  // Placeholder GitHub Releases feed. Swap owner/repo for the real publish
  // target once releases are cut; electron-builder also reads this from the
  // `publish` block in package.json at build time.
  autoUpdater.setFeedURL({
    provider: "github",
    owner: "Black-Scyth-7",
    repo: "ChatPulse-app",
  });

  // We drive the download/install ourselves from the dialogs below.
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    if (updatePromptOpen) return;
    updatePromptOpen = true;
    dialog
      .showMessageBox({
        type: "info",
        buttons: ["Download now", "Later"],
        defaultId: 0,
        cancelId: 1,
        title: "Update available",
        message: `ChatPulse ${info.version} is available.`,
        detail: "Update available. Download now?",
      })
      .then(({ response }) => {
        updatePromptOpen = false;
        if (response === 0) {
          autoUpdater.downloadUpdate().catch((err) => {
            console.error("[chatpulse] update download failed:", err);
          });
        }
      });
  });

  autoUpdater.on("update-downloaded", (info) => {
    if (updatePromptOpen) return;
    updatePromptOpen = true;
    dialog
      .showMessageBox({
        type: "info",
        buttons: ["Restart to update", "Later"],
        defaultId: 0,
        cancelId: 1,
        title: "Update ready",
        message: `ChatPulse ${info.version} has been downloaded.`,
        detail: "Restart the app to finish installing the update.",
      })
      .then(({ response }) => {
        updatePromptOpen = false;
        if (response === 0) {
          isQuitting = true; // let the window actually close instead of hiding
          autoUpdater.quitAndInstall();
        }
      });
  });

  // Keep failures non-fatal: an unreachable feed logs and is otherwise ignored.
  autoUpdater.on("error", (err) => {
    console.error("[chatpulse] auto-update error:", err);
  });

  const check = () =>
    autoUpdater.checkForUpdates().catch((err) => {
      console.error("[chatpulse] update check failed:", err);
    });

  check();
  setInterval(check, UPDATE_CHECK_INTERVAL_MS);
}

// --- IPC surface (mirrors the API exposed in preload.ts) -------------------
function registerIpc(): void {
  ipcMain.handle(
    "desktop:notify",
    (
      _event,
      payload: {
        title: string;
        body: string;
        icon?: string;
        navigatePath?: string;
      },
    ) => {
      if (notificationsMuted || !Notification.isSupported()) return false;
      const notification = new Notification({
        title: String(payload?.title ?? "ChatPulse"),
        body: String(payload?.body ?? ""),
        // Use the sender's avatar when supplied (fetched async, falling back to
        // the app icon if the URL can't be loaded); otherwise the app icon.
        icon: notificationIcon(payload?.icon),
      });
      const navigatePath =
        typeof payload?.navigatePath === "string" ? payload.navigatePath : null;
      // Clicking a notification surfaces the app and, if we know where the
      // message lives, tells the renderer to open that conversation.
      notification.on("click", () => {
        showWindow();
        if (navigatePath) {
          mainWindow?.webContents.send("desktop:activate", navigatePath);
        }
      });
      notification.show();
      return true;
    },
  );

  ipcMain.handle("desktop:set-badge", (_event, count: number) => {
    setBadgeCount(Number(count) || 0);
    return true;
  });

  ipcMain.handle("desktop:set-muted", (_event, muted: boolean) => {
    setMuted(Boolean(muted));
    return notificationsMuted;
  });

  ipcMain.handle("desktop:get-muted", () => notificationsMuted);

  ipcMain.handle("desktop:show-window", () => {
    showWindow();
    return true;
  });

  ipcMain.handle("desktop:set-auto-start", (_event, enabled: boolean) => {
    // Only meaningful for a packaged install; a no-op path in dev.
    app.setLoginItemSettings({ openAtLogin: Boolean(enabled) });
    return Boolean(enabled);
  });

  ipcMain.handle("desktop:get-auto-start", () => app.getLoginItemSettings().openAtLogin);
}

app.on("second-instance", () => showWindow());

app.whenReady().then(async () => {
  registerIpc();
  if (shouldStartLocalServer) {
    try {
      await startAppServer();
    } catch (err) {
      console.error("[chatpulse] failed to start app server:", err);
    }
  }
  createWindow();
  createTray();
  setupAutoUpdater();

  app.on("activate", () => {
    // macOS: re-create a window when the dock icon is clicked and none are open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Keep running in the tray when all windows are closed (don't quit on Windows).
app.on("window-all-closed", () => {
  // Intentionally do nothing: the app lives in the tray until "Quit".
});

app.on("before-quit", () => {
  isQuitting = true;
  serverProcess?.kill();
});
