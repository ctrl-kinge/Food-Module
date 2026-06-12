import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

/** Persist an in-app notification and fire a web push. Best-effort: never
 *  throws, so a failure here can't break the request that triggered it. */
export async function createNotification(args: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  orderId?: string;
  url?: string;
}) {
  const { userId, type, title, body, orderId, url } = args;
  try {
    await prisma.notification.create({
      data: { userId, type, title, body, orderId },
    });
    await sendPushToUser(userId, { title, body, url });
  } catch {
    /* notifications are best-effort */
  }
}
