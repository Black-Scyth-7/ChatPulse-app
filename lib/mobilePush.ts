/**
 * Capacitor push-notification wiring for the Android app (CHAA-55).
 *
 * ChatPulse mobile is a **remote webview** (CHAA-51): the same Next.js web
 * client runs inside the native shell. So push registration lives here in the
 * web client, gated on the native platform — exactly like the Electron bridge
 * in lib/desktop.ts is gated on `window.desktop`. On the web/desktop build every
 * function below is an inert no-op.
 *
 * Flow:
 *  - {@link registerPushNotifications} asks for permission, registers with FCM,
 *    forwards the device token to `POST /api/users/push-token`, and navigates
 *    when a notification is tapped. FCM re-fires the `registration` listener
 *    with a fresh token whenever it rotates, so the backend always has the
 *    current one ("token is refreshed and re-sent" acceptance criterion).
 *  - {@link updatePushMode} re-sends the token with a changed notification mode
 *    so a mute / DMs-only choice is honoured for offline pushes.
 *
 * The `@capacitor/*` plugins are imported dynamically inside the native branch:
 * their methods are unimplemented on web, so we never load or call them there.
 */
import { apiUrl } from "./apiBase";
import { isNativePlatform } from "./capacitor";
import { loadNotificationMode, type NotificationMode } from "./notifications";

/** Data payload FCM delivers with each ChatPulse push. */
interface PushData {
  conversationId?: string;
  type?: "channel" | "dm";
}

/** The most recent FCM token, kept so a mode change can re-send it. */
let lastToken: string | null = null;

/** POST the current token + mode to the backend. Silent on failure. */
async function sendToken(token: string, mode: NotificationMode): Promise<void> {
  try {
    await fetch(apiUrl("/api/users/push-token"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Cookies carry the session in the remote webview (same-origin backend).
      credentials: "include",
      body: JSON.stringify({ token, mode }),
    });
  } catch {
    // Offline or transient; FCM will re-fire `registration` and we retry then.
  }
}

/**
 * Register for push notifications and wire tap-to-navigate. No-op off native.
 * Returns a cleanup function that removes the listeners.
 */
export async function registerPushNotifications(opts: {
  /** Navigate the app to an in-app route (e.g. `/dm/123`, `/channel/abc`). */
  onNavigate: (path: string) => void;
}): Promise<() => void> {
  if (!isNativePlatform()) return () => {};

  let PushNotifications: typeof import("@capacitor/push-notifications").PushNotifications;
  try {
    ({ PushNotifications } = await import("@capacitor/push-notifications"));
  } catch {
    return () => {};
  }

  // Ask for permission; request it if the user hasn't decided yet.
  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
    perm = await PushNotifications.requestPermissions();
  }
  if (perm.receive !== "granted") return () => {};

  // A fresh token on first register and on every FCM rotation.
  const regHandle = await PushNotifications.addListener(
    "registration",
    (token) => {
      lastToken = token.value;
      void sendToken(token.value, loadNotificationMode());
    },
  );

  const errHandle = await PushNotifications.addListener(
    "registrationError",
    (err) => {
      console.error("[push] registration error:", err);
    },
  );

  // Tapping a notification opens the conversation it describes.
  const tapHandle = await PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (action) => {
      const data = action.notification.data as PushData;
      if (!data?.conversationId) return;
      const path =
        data.type === "dm"
          ? `/dm/${data.conversationId}`
          : `/channel/${data.conversationId}`;
      opts.onNavigate(path);
    },
  );

  await PushNotifications.register();

  return () => {
    void regHandle.remove();
    void errHandle.remove();
    void tapHandle.remove();
  };
}

/**
 * Re-send the last token with an updated notification mode, so a mute /
 * DMs-only change takes effect for offline pushes. No-op off native or before
 * the first token arrives.
 */
export function updatePushMode(mode: NotificationMode): void {
  if (!isNativePlatform() || !lastToken) return;
  void sendToken(lastToken, mode);
}
