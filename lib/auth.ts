import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

/**
 * Auth.js (NextAuth v5) configuration for ChatPulse.
 *
 * Uses the Prisma adapter for account/user persistence with a JWT session
 * strategy. The shared, Edge-safe pieces (providers, pages, JWT/session
 * callbacks) live in lib/auth.config.ts so the middleware can reuse them
 * without pulling Prisma into the Edge runtime.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
});

/**
 * Server-side session helper. Wraps `auth()` so route handlers, server
 * components, and server actions can read the current session with a single
 * import. Returns `null` when the request is unauthenticated.
 */
export const getServerSession = auth;
