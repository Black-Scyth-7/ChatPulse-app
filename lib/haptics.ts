/**
 * Haptic feedback for the ChatPulse Android app (CHAA-56).
 *
 * A thin wrapper over `@capacitor/haptics`, gated on the native platform so the
 * web/desktop build never loads or calls the plugin. Each helper is fire-and-
 * forget: a failed buzz should never surface to the user or block the UI.
 *
 * The plugin is imported dynamically inside the native branch — its methods are
 * unimplemented on web, so we never pull it into the web bundle path either.
 */
import { isNativePlatform } from "./capacitor";

/**
 * A short "impact" tap. Used for discrete confirmations — sending a message,
 * a new message landing while the app is open, a pull-to-refresh firing.
 * `style` maps to the plugin's ImpactStyle (Light/Medium/Heavy).
 */
export function hapticImpact(style: "light" | "medium" = "light"): void {
  if (!isNativePlatform()) return;
  void (async () => {
    try {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({
        style: style === "medium" ? ImpactStyle.Medium : ImpactStyle.Light,
      });
    } catch {
      // Plugin missing/unimplemented or the device declined — silently ignore.
    }
  })();
}
