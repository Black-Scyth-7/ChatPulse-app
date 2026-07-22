import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { credentialsSchema } from "@/lib/validators/auth";

/**
 * Auth.js (NextAuth v5) configuration for ChatPulse.
 *
 * Uses the Prisma adapter for account/user persistence with a JWT session
 * strategy. The shared, Edge-safe pieces (providers, pages, JWT/session
 * callbacks) live in lib/auth.config.ts so the middleware can reuse them
 * without pulling Prisma into the Edge runtime.
 *
 * The Credentials provider lives here rather than in auth.config.ts on purpose:
 * its `authorize` needs Prisma and bcrypt, neither of which is Edge-safe. The
 * middleware only decodes the signed JWT (it never runs `authorize`), so it does
 * not need this provider in its config.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...authConfig.providers,
    Credentials({
      // The login form posts these fields; the object shapes the default form
      // Auth.js would otherwise render (unused — we ship our own UI).
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        // No user, or an OAuth-only account with no password set: reject without
        // leaking which case it was.
        if (!user?.hashedPassword) return null;

        const passwordMatches = await bcrypt.compare(password, user.hashedPassword);
        if (!passwordMatches) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
});

/**
 * Server-side session helper. Wraps `auth()` so route handlers, server
 * components, and server actions can read the current session with a single
 * import. Returns `null` when the request is unauthenticated.
 */
export const getServerSession = auth;
