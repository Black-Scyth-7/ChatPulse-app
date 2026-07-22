import { z } from "zod";

/**
 * Zod schema for `POST /api/users/push-token`. The mobile client sends its FCM
 * registration token, optionally with the current notification preference so
 * the server can honour a muted / DMs-only choice when the app is offline.
 */
export const pushTokenSchema = z.object({
  /** The device FCM registration token from PushNotifications.register(). */
  token: z.string().min(1).max(4096),
  /** Mirror of the client's notification mode; defaults to "all" when omitted. */
  mode: z.enum(["all", "dm", "muted"]).optional(),
});

export type PushTokenInput = z.infer<typeof pushTokenSchema>;
