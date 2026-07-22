/**
 * Firebase Admin SDK bootstrap for server-side push notifications (CHAA-55).
 *
 * The realtime server (server/index.ts) calls {@link sendPushNotification} to
 * deliver a Firebase Cloud Messaging (FCM) push when a message arrives for a
 * recipient who has no active socket connection — i.e. the app is backgrounded
 * or closed on their device.
 *
 * Credentials come from the `FIREBASE_SERVICE_ACCOUNT` env var, which holds the
 * JSON service-account key generated in the Firebase console (see
 * docs/push-notifications.md). It may be the raw JSON or a base64-encoded blob;
 * both are accepted so it survives shells/CI that dislike multi-line secrets.
 *
 * When the env var is absent or malformed the module degrades gracefully: init
 * is skipped and {@link sendPushNotification} becomes a no-op that logs once.
 * This keeps local dev and the web/desktop builds — which never send pushes —
 * running without any Firebase configuration.
 */
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

/** Parsed shape of the service-account JSON we actually use. */
interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let messaging: Messaging | null = null;
let initTried = false;

/** Decode `FIREBASE_SERVICE_ACCOUNT` (raw JSON or base64) into a credential. */
function parseServiceAccount(raw: string): ServiceAccount | null {
  const candidates = [raw];
  // Also try base64: a common way to pass the multi-line key through env vars.
  try {
    candidates.push(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    // Not base64-decodable; the raw candidate above still stands.
  }
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Partial<ServiceAccount>;
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          project_id: parsed.project_id,
          client_email: parsed.client_email,
          // Env-var round-trips often escape the newlines in the PEM key.
          private_key: parsed.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

/** Lazily initialize Firebase Admin. Returns the Messaging client or null. */
function getMessagingClient(): Messaging | null {
  if (messaging) return messaging;
  if (initTried) return null;
  initTried = true;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.warn(
      "[firebase] FIREBASE_SERVICE_ACCOUNT not set — push notifications disabled.",
    );
    return null;
  }
  const account = parseServiceAccount(raw);
  if (!account) {
    console.error(
      "[firebase] FIREBASE_SERVICE_ACCOUNT could not be parsed — push notifications disabled.",
    );
    return null;
  }

  try {
    // Reuse an existing app across hot reloads / multiple imports.
    const app: App =
      getApps()[0] ??
      initializeApp({
        credential: cert({
          projectId: account.project_id,
          clientEmail: account.client_email,
          privateKey: account.private_key,
        }),
      });
    messaging = getMessaging(app);
    return messaging;
  } catch (err) {
    console.error("[firebase] init failed — push notifications disabled:", err);
    return null;
  }
}

/** Whether the recipient conversation type this push describes. */
export type PushConversationType = "channel" | "dm";

export interface PushNotificationInput {
  /** Recipient's device FCM registration token. */
  token: string;
  /** Notification title — the sender's name. */
  title: string;
  /** Notification body — the message preview (already truncated by the caller). */
  body: string;
  /** Conversation the tap should open. */
  conversationId: string;
  /** Whether the conversation is a channel or a direct message. */
  type: PushConversationType;
}

/**
 * Send a single FCM push. Resolves to `true` on success. On an
 * invalid/expired token the caller receives `"unregistered"` so it can clear
 * the stale token from the DB; any other failure resolves `"error"`.
 */
export async function sendPushNotification(
  input: PushNotificationInput,
): Promise<"sent" | "unregistered" | "error" | "disabled"> {
  const client = getMessagingClient();
  if (!client) return "disabled";

  try {
    await client.send({
      token: input.token,
      notification: { title: input.title, body: input.body },
      data: {
        conversationId: input.conversationId,
        type: input.type,
      },
      android: {
        priority: "high",
        notification: {
          // Collapse repeated alerts for one conversation into a single entry.
          tag: `${input.type}:${input.conversationId}`,
        },
      },
    });
    return "sent";
  } catch (err) {
    const code = (err as { code?: string; errorInfo?: { code?: string } })
      ?.errorInfo?.code ?? (err as { code?: string })?.code;
    if (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token" ||
      code === "messaging/invalid-argument"
    ) {
      return "unregistered";
    }
    console.error("[firebase] sendPushNotification failed:", err);
    return "error";
  }
}

/** Whether Firebase push is configured in this process (for diagnostics). */
export function isPushConfigured(): boolean {
  return getMessagingClient() !== null;
}
