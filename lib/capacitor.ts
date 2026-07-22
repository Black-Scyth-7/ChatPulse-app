/**
 * Shared Capacitor helpers for the ChatPulse Android app (CHAA-51 remote
 * webview: the same Next.js web client runs inside the native shell).
 *
 * Everything here is SSR-safe and a no-op off the native platform, so the web
 * and desktop builds import it freely — `isNativePlatform()` gates any actual
 * plugin use, exactly like `window.desktop` gates the Electron bridge.
 */

/** True only inside the Capacitor native shell (Android/iOS). SSR-safe. */
export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (
    window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean };
    }
  ).Capacitor;
  return typeof cap?.isNativePlatform === "function"
    ? cap.isNativePlatform()
    : false;
}
