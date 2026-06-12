import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const PUBLIC = process.env.VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;

/** True only when both VAPID keys are configured. */
export const PUSH_ENABLED = Boolean(PUBLIC && PRIVATE);

if (PUSH_ENABLED) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
    PUBLIC as string,
    PRIVATE as string,
  );
}

export type PushPayload = { title: string; body: string; url?: string };

/** Send a push to every subscription a user has. No-op when push is disabled.
 *  Prunes subscriptions the browser has expired (404/410). Never throws. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!PUSH_ENABLED) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await prisma.pushSubscription
            .delete({ where: { id: s.id } })
            .catch(() => {});
        }
      }
    }),
  );
}
