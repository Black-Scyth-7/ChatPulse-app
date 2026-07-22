import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for the ChatPulse Android app.
 *
 * Approach (CHAA-51 decision): **remote webview**. The native shell loads the
 * hosted ChatPulse web app directly over `server.url`, so the app reuses the
 * existing SSR site, cookie auth, JSON API and Socket.io as-is — no static
 * export / SPA refactor required.
 *
 * Point it at the backend with `CAP_SERVER_URL` (a production HTTPS URL, or a
 * LAN `http://192.168.x.x:3000` for dev live-reload); falls back to
 * `NEXT_PUBLIC_API_URL`. `cleartext` is enabled only for plain-HTTP dev URLs so
 * production stays HTTPS-only. When neither is set the bundled placeholder shell
 * in `webDir` is shown with setup instructions.
 */
const serverUrl =
  process.env.CAP_SERVER_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";
const isHttp = serverUrl.startsWith("http://");

const config: CapacitorConfig = {
  appId: "com.chatpulse.app",
  appName: "ChatPulse",
  webDir: "mobile/shell",
  ...(serverUrl
    ? { server: { url: serverUrl, cleartext: isHttp } }
    : {}),
  plugins: {
    SplashScreen: {
      // Auto-hide once the webview reports loaded; the client also calls
      // SplashScreen.hide() on mount (lib/nativeShell.ts) so the logo clears
      // exactly when the app is ready without risking a hang.
      launchAutoHide: true,
      androidSplashResourceName: "splash",
      // ChatPulse logo centered on the chat-canvas background (#0B141A).
      backgroundColor: "#0B141A",
      showSpinner: false,
    },
    StatusBar: {
      // Style.Dark = light icons/text, over our dark app-header background.
      style: "dark",
      backgroundColor: "#1F2C34",
    },
  },
};

export default config;
