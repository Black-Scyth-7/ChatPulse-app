import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import { pushTokenSchema } from "@/lib/validators/push";

/**
 * POST /api/users/push-token — register the caller's device FCM token (CHAA-55).
 *
 * The mobile (Capacitor) client calls this after `PushNotifications.register()`
 * resolves, and again whenever FCM rotates the token. We store the latest token
 * on the user so the realtime server can send an offline push when a message
 * arrives for them (see server/index.ts → sendPushNotification).
 *
 * Body: `{ token: string, mode?: "all" | "dm" | "muted" }`. `mode` mirrors the
 * client's notification preference so a muted / DMs-only choice is honoured even
 * when the browser socket isn't connected.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = pushTokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { token, mode } = parsed.data;

  await prisma.user.update({
    where: { id: auth.userId },
    data: {
      pushToken: token,
      pushTokenUpdatedAt: new Date(),
      ...(mode ? { notificationMode: mode } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/users/push-token — clear the caller's token (e.g. on sign-out or
 * when the user revokes notification permission), so we stop pushing to a
 * device that no longer wants alerts.
 */
export async function DELETE(): Promise<NextResponse> {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  await prisma.user.update({
    where: { id: auth.userId },
    data: { pushToken: null, pushTokenUpdatedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
