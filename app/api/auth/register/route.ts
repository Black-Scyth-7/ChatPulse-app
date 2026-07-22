import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";
import { registerSchema } from "@/lib/validators/auth";

/**
 * POST /api/auth/register — create an email/password account.
 *
 * Unauthenticated by design: this is how a new user first gets an account. The
 * password is hashed with bcrypt (cost 12) before storage; the plaintext is
 * never persisted or logged. Sign-in itself goes through the Credentials
 * provider (see lib/auth.ts) once the account exists.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return jsonError("An account with that email already exists", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, hashedPassword },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
