/**
 * Base URL for the ChatPulse backend (JSON API + Socket.io).
 *
 * On the web/desktop build the frontend is served from the same origin as the
 * API, so `NEXT_PUBLIC_API_URL` is unset and this resolves to an empty string —
 * every request stays a same-origin relative path and behaviour is unchanged.
 *
 * In the Capacitor (mobile) build the web assets are packaged into the app and
 * have no server of their own, so `NEXT_PUBLIC_API_URL` must point at the hosted
 * backend (e.g. `https://chatpulse.example.com`). All client fetches and the
 * realtime socket are routed through here so a single env var retargets them.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Prefix a relative API path with {@link API_BASE_URL}. Absolute URLs are
 * returned untouched so callers can pass either. With no base configured this
 * is an identity transform over the relative path.
 */
export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path}`;
}
