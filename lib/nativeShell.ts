/**
 * Native shell chrome for the ChatPulse Android app (CHAA-56): status bar and
 * splash screen. Remote-webview build (CHAA-51), so this runs in the web client
 * and is gated on the native platform — a no-op on web/desktop.
 *
 * The `capacitor.config.ts` sets the launch-time status-bar colour and the
 * splash resource, but we re-assert the status bar from JS (config values don't
 * always survive a remote page load) and drive the splash hide from here so it
 * clears exactly when the app has mounted rather than on a fixed timer.
 */
import { isNativePlatform } from "./capacitor";

/** App header colour — the status bar matches it for a seamless top edge. */
const STATUS_BAR_BG = "#1F2C34";

/**
 * Configure the Android status bar: dark app-header background with light
 * text/icons, sitting above (not behind) the webview so no content is hidden.
 */
export async function initStatusBar(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    // Style.Dark = light text/icons, for our dark header background.
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: STATUS_BAR_BG });
    // Keep the webview below the status bar so the header isn't clipped by it.
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch {
    // Plugin unavailable (older shell) — the config launch colour still applies.
  }
}

/**
 * Hide the launch splash screen. Called once the app UI has mounted so the
 * ChatPulse logo stays up through cold-start load, then fades out on ready.
 */
export async function hideSplash(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    // No splash plugin, or already hidden by launchAutoHide — nothing to do.
  }
}
