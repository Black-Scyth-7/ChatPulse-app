import { z } from "zod";

/**
 * Zod schemas for the realtime message/channel socket events. Shared so the
 * Socket.io handlers validate every inbound payload the same way the REST
 * routes validate their bodies.
 */

const id = z.string().trim().min(1, "id is required");

const body = z
  .string()
  .trim()
  .min(1, "Message cannot be empty")
  .max(4000, "Message must be 4000 characters or fewer");

/** Payload for `message:send`. */
export const messageSendSchema = z.object({
  channelId: id,
  body,
});

/** Payload for `message:edit`. */
export const messageEditSchema = z.object({
  messageId: id,
  body,
});

/** Payload for `message:delete`. */
export const messageDeleteSchema = z.object({
  messageId: id,
});

/** Payload for `channel:join`, `channel:leave`, and typing events. */
export const channelRefSchema = z.object({
  channelId: id,
});

export type MessageSendInput = z.infer<typeof messageSendSchema>;
export type MessageEditInput = z.infer<typeof messageEditSchema>;
export type MessageDeleteInput = z.infer<typeof messageDeleteSchema>;
export type ChannelRefInput = z.infer<typeof channelRefSchema>;
