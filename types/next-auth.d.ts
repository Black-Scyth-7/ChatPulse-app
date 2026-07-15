import type { DefaultSession } from "next-auth";

/**
 * Module augmentation so the database user id is part of the typed session and
 * JWT. `session.user.id` is populated by the session callback in lib/auth.ts.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
