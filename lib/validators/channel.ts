import { z } from "zod";

/**
 * Zod schemas for the channel API request bodies. Shared so the route handlers
 * and any future callers agree on the accepted shape and limits.
 */

const name = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(80, "Name must be 80 characters or fewer");

const description = z
  .string()
  .trim()
  .max(500, "Description must be 500 characters or fewer")
  .nullish()
  .transform((v) => (v === "" ? null : v ?? null));

/** Body for `POST /api/channels`. */
export const createChannelSchema = z.object({
  name,
  description,
  isPrivate: z.boolean().optional().default(false),
});

/**
 * Body for `PATCH /api/channels/[id]`. Both fields are optional but at least
 * one must be present, otherwise the request is a no-op.
 */
export const updateChannelSchema = z
  .object({
    name: name.optional(),
    description,
  })
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: "Provide at least one of name or description",
  });

export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;
