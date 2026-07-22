import { z } from "zod";

/**
 * Zod schemas for the email/password auth flows. Shared between the registration
 * route handler and the Credentials provider's `authorize` so both agree on the
 * accepted shape and limits.
 */

/** Normalise emails so "A@X.com" and "a@x.com" resolve to the same account. */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address");

/**
 * bcrypt hashes only the first 72 bytes of the password, so cap the input there
 * to make the limit explicit rather than silently ignoring extra characters.
 */
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be 72 characters or fewer");

/** Body for `POST /api/auth/register`. */
export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name must be 80 characters or fewer"),
  email,
  password,
});

/**
 * Shape passed to the Credentials provider's `authorize`. Deliberately lenient
 * on the password (any non-empty string) — validity is decided by the bcrypt
 * comparison, not by re-checking the registration rules at sign-in.
 */
export const credentialsSchema = z.object({
  email,
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
