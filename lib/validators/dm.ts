import { z } from "zod";

/**
 * Zod schemas for the direct-message API and socket events. Shared so the REST
 * routes and the Socket.io handlers validate inbound payloads the same way the
 * channel message flows do.
 */

const id = z.string().trim().min(1, "id is required");

const body = z
  .string()
  .trim()
  .min(1, "Message cannot be empty")
  .max(4000, "Message must be 4000 characters or fewer");

/** Body for `POST /api/dm` — start or fetch a 1:1 conversation with a user. */
export const createDmSchema = z.object({
  userId: id,
});

/** Payload for the `dm:send` socket event. */
export const dmSendSchema = z.object({
  conversationId: id,
  content: body,
});

export type CreateDmInput = z.infer<typeof createDmSchema>;
export type DmSendInput = z.infer<typeof dmSendSchema>;
