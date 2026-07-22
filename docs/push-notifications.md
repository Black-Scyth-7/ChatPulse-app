# Android push notifications (FCM) — CHAA-55

ChatPulse mobile is a Capacitor **remote webview** (see CHAA-51): the native
Android shell loads the hosted web app. Push notifications use **Firebase Cloud
Messaging (FCM)** with the `@capacitor/push-notifications` plugin on the client
and `firebase-admin` on the backend.

When a message arrives for a user who has **no active socket connection** (app
backgrounded/closed), the realtime server sends an FCM push instead of relying
on the in-app toast.

## How it works

| Piece | File |
| --- | --- |
| Firebase Admin init + `sendPushNotification` | `lib/firebase.ts` |
| Store the device token | `POST /api/users/push-token` → `app/api/users/push-token/route.ts` |
| Offline detection + push on new message/DM | `server/index.ts` (`pushOfflineChannelMembers`, `pushOfflineDmParticipants`) |
| Mobile register + tap-to-navigate | `lib/mobilePush.ts`, wired in `components/conversations/ConversationsProvider.tsx` |
| Token/mode columns | `User.pushToken`, `User.pushTokenUpdatedAt`, `User.notificationMode` (Prisma) |

- **Title** = sender name, **body** = message preview (truncated to 100 chars),
  **data** = `{ conversationId, type: "channel" | "dm" }`.
- **Token refresh:** FCM re-fires the `registration` listener with a new token
  whenever it rotates; the client re-POSTs it, so the backend always has the
  current one. A token FCM reports as unregistered is cleared from the DB.
- **Mute:** `notificationMode` (`all` / `dm` / `muted`) mirrors the client's
  notification preference server-side, so an offline push is suppressed for a
  muted user and channel pushes are suppressed in DMs-only mode. (Per-message
  mute is at the app's existing global granularity; true per-conversation mute
  would need its own model + UI — tracked as a follow-up, not in this ticket.)

## One-time Firebase setup (manual)

1. **Create a Firebase project** at <https://console.firebase.google.com>.
2. **Add an Android app** with package name **`com.chatpulse.app`**.
3. **Download `google-services.json`** and place it in **`android/app/`**.
   - It is gitignored (a per-project secret). The Android build already applies
     the `com.google.gms.google-services` plugin automatically when the file is
     present (`android/app/build.gradle`), and the classpath is in
     `android/build.gradle` — no Gradle edits needed.
4. **Generate an Admin SDK key**: Project settings → *Service accounts* →
   *Generate new private key*. Store the JSON as the **`FIREBASE_SERVICE_ACCOUNT`**
   env var on the backend (raw JSON on one line, or base64-encoded — both work).
5. `pnpm mobile:build` (`cap sync`) and rebuild the app.

### Verifying

- Backend logs `[firebase] FIREBASE_SERVICE_ACCOUNT not set …` when the env var
  is missing — push is disabled and the rest of the app is unaffected.
- On the device: sign in, accept the notification permission prompt, then
  background the app and have another user message you — the push should arrive,
  and tapping it should open the right conversation.

## Acceptance criteria mapping

- ✅ Receives a push when offline and a message arrives → `server/index.ts`
  offline detection (`socketsByUser`) + `sendPushNotification`.
- ✅ Tapping opens the correct conversation → `pushNotificationActionPerformed`
  handler in `lib/mobilePush.ts` navigates to `/dm/:id` or `/channel/:id`.
- ✅ Token refreshed and re-sent on change → `registration` listener re-POSTs.
- ✅ No notification for muted conversations → `notificationMode` honoured in
  `pushAllowedByMode` (server) at the app's current mute granularity.
