import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for the ChatPulse Android app.
 *
 * The mobile shell has no backend of its own, so it talks to a hosted ChatPulse
 * deployment for both the JSON API and the realtime socket (see
 * `lib/apiBase.ts` / `NEXT_PUBLIC_API_URL`).
 *
 * Live-reload against a running dev server is opt-in: set `CAP_SERVER_URL` to
 * your machine's LAN address (e.g. `http://192.168.1.20:3000`) before running
 * `pnpm cap sync`. When unset, the packaged web assets in `webDir` are loaded.
 * `cleartext` is only enabled for the dev URL so HTTP works locally; production
 * traffic stays HTTPS.
 */
const devServerUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "com.chatpulse.app",
  appName: "ChatPulse",
  webDir: "out",
  ...(devServerUrl
    ? { server: { url: devServerUrl, cleartext: true } }
    : {}),
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      androidSplashResourceName: "splash",
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#1F2C34",
    },
  },
};

export default config;
