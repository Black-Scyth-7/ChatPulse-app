import { z } from "zod";

/**
 * Zod schemas for presence updates. Shared by `PATCH /api/users/me` and the
 * `presence:update` socket event so both accept the same lowercase wire status.
 */

/** Presence status as sent over the wire / REST (lowercase). */
export const presenceStatusSchema = z.enum(["online", "away", "offline"]);

/** Body for `PATCH /api/users/me` and payload for the `presence:update` event. */
export const presenceUpdateSchema = z.object({
  status: presenceStatusSchema,
});

export type PresenceUpdateInput = z.infer<typeof presenceUpdateSchema>;
