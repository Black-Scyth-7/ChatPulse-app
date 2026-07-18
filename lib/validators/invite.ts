import { z } from "zod";

/**
 * Zod schema for the channel invite request body. Shared so the route handler
 * and any future callers agree on the accepted shape.
 */

/** Body for `POST /api/channels/[id]/invite`. */
export const inviteSchema = z.object({
  userId: z.string().trim().min(1, "userId is required"),
});

export type InviteInput = z.infer<typeof inviteSchema>;
