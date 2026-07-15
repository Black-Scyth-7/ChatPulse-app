import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

/**
 * Route protection for ChatPulse.
 *
 * We instantiate a lightweight NextAuth from the Edge-safe config (no Prisma
 * adapter) purely to read the JWT session inside the middleware. The `matcher`
 * below scopes middleware to the chat surfaces and the login page, so
 * /api/auth/* and static assets are never intercepted.
 *
 * Behaviour:
 *  - Unauthenticated visit to /channel/* or /dm/* -> redirect to /login.
 *  - Authenticated visit to /login -> redirect into the app (/channel/general).
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = Boolean(req.auth);

  const isProtectedRoute =
    nextUrl.pathname.startsWith("/channel") ||
    nextUrl.pathname.startsWith("/dm");
  const isLoginRoute = nextUrl.pathname === "/login";

  if (isProtectedRoute && !isLoggedIn) {
    return Response.redirect(new URL("/login", nextUrl));
  }

  if (isLoginRoute && isLoggedIn) {
    return Response.redirect(new URL("/channel/general", nextUrl));
  }

  return undefined;
});

/**
 * Only run middleware on the protected chat routes and the login page. Because
 * /api/auth/* is not matched here, the OAuth callback and session endpoints run
 * without interference.
 */
export const config = {
  matcher: ["/channel/:path*", "/dm/:path*", "/login"],
};
