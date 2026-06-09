"use client";

import { useEffect, useState } from "react";
import type { OrderStatus } from "@prisma/client";
import { STATUS_FLOW, STATUS_LABELS } from "@/lib/order-status";
import { getSocket } from "@/lib/socket-client";
import StatusBadge from "@/components/StatusBadge";

export default function OrderStatusTracker({
  orderId,
  initialStatus,
}: {
  orderId: string;
  initialStatus: OrderStatus;
}) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setLive(true);
    const onDisconnect = () => setLive(false);
    const onStatus = (data: { orderId: string; status: OrderStatus }) => {
      if (data.orderId === orderId) setStatus(data.status);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("order:status", onStatus);
    if (socket.connected) setLive(true);
    socket.emit("order:join", orderId);

    return () => {
      socket.emit("order:leave", orderId);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("order:status", onStatus);
    };
  }, [orderId]);

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <StatusBadge status={status} />
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              live ? "bg-green-500" : "bg-gray-300"
            }`}
          />
          {live ? "Live" : "Connecting…"}
        </span>
      </div>

      {status === "CANCELLED" ? (
        <p className="mt-4 text-sm text-gray-600">This order was cancelled.</p>
      ) : (
        <ol className="mt-4 space-y-2">
          {STATUS_FLOW.map((s, i) => {
            const currentIndex = STATUS_FLOW.indexOf(status);
            const done = i < currentIndex;
            const active = i === currentIndex;
            return (
              <li key={s} className="flex items-center gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                    active
                      ? "bg-orange-600 text-white"
                      : done
                        ? "bg-orange-200 text-orange-800"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span
                  className={`text-sm ${
                    active
                      ? "font-semibold"
                      : done
                        ? "text-gray-700"
                        : "text-gray-400"
                  }`}
                >
                  {STATUS_LABELS[s]}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
