import NextAuth, { type NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

/**
 * Auth.js (NextAuth v5) configuration for ChatPulse.
 *
 * Uses the Prisma adapter for account/user persistence with a JWT session
 * strategy. The jwt/session callbacks propagate the database user id onto the
 * token and session so downstream code can rely on `session.user.id`.
 */
export const authOptions: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  // Read AUTH_SECRET / NEXTAUTH_SECRET automatically; trustHost keeps the
  // callback URL working behind the local dev proxy and in preview deploys.
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Persist the database user id on the token at sign-in. On subsequent
    // requests `user` is undefined and we fall back to the existing token.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // Expose the user id (plus the standard name/email/image) on the session.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string | undefined) ?? token.sub ?? "";
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

/**
 * Server-side session helper. Wraps `auth()` so route handlers, server
 * components, and server actions can read the current session with a single
 * import. Returns `null` when the request is unauthenticated.
 */
export const getServerSession = auth;
