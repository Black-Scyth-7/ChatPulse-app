import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

/**
 * Edge-safe portion of the Auth.js (NextAuth v5) configuration.
 *
 * This config deliberately omits the Prisma adapter so it can run inside the
 * Edge middleware runtime (Prisma's client is not Edge-compatible). The full
 * config in lib/auth.ts spreads this and adds the adapter for the Node runtime.
 *
 * Keeping the providers, pages, and JWT/session callbacks here means middleware
 * and server both agree on how `session.user.id` is derived from the token.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  // Read AUTH_SECRET / NEXTAUTH_SECRET automatically; trustHost keeps the
  // callback URL working behind the local dev proxy and in preview deploys.
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
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
