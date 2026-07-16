import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api";
import type { UserSummary } from "@/lib/types";

/** Cap on how many users a single search returns. */
const RESULT_LIMIT = 25;

/**
 * GET /api/users?q=… — search users by name (or email) for starting a DM.
 *
 *  - Requires an authenticated session.
 *  - The current user is always excluded from the results.
 *  - `q` is an optional case-insensitive substring filter; when absent, returns
 *    the first page of users so the picker has something to show immediately.
 *  - Results are ordered by name and capped at RESULT_LIMIT.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  const users = await prisma.user.findMany({
    where: {
      id: { not: auth.userId },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true, email: true, image: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    take: RESULT_LIMIT,
  });

  const result: UserSummary[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
  }));

  return NextResponse.json({ users: result });
}
