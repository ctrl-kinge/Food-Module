"use client";

import { useEffect, useState } from "react";
import type { OrderStatus } from "@prisma/client";
import { STATUS_FLOW, STATUS_LABELS } from "@/lib/order-status";
import { getSocket } from "@/lib/socket-client";
import { formatEta, formatDistance } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import DeliveryMap, { type MapPoint } from "@/components/DeliveryMap";

type EtaData = {
  etaSeconds: number;
  distanceMeters: number;
  trafficAware: boolean;
  label: string;
};

const TRACKING_STATES: OrderStatus[] = ["PICKED_UP", "EN_ROUTE"];

export default function OrderStatusTracker({
  orderId,
  initialStatus,
  pickup,
  dest,
}: {
  orderId: string;
  initialStatus: OrderStatus;
  pickup: MapPoint;
  dest: MapPoint;
}) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [live, setLive] = useState(false);
  const [rider, setRider] = useState<{ lat: number; lng: number } | null>(null);
  const [eta, setEta] = useState<EtaData | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setLive(true);
    const onDisconnect = () => setLive(false);
    const onStatus = (data: { orderId: string; status: OrderStatus }) => {
      if (data.orderId === orderId) setStatus(data.status);
    };
    const onLocation = (data: { orderId: string; lat: number; lng: number }) => {
      if (data.orderId === orderId) setRider({ lat: data.lat, lng: data.lng });
    };
    const onEta = (data: EtaData & { orderId: string }) => {
      if (data.orderId === orderId) setEta(data);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("order:status", onStatus);
    socket.on("rider:location", onLocation);
    socket.on("order:eta", onEta);
    if (socket.connected) setLive(true);
    socket.emit("order:join", orderId);

    return () => {
      socket.emit("order:leave", orderId);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("order:status", onStatus);
      socket.off("rider:location", onLocation);
      socket.off("order:eta", onEta);
    };
  }, [orderId]);

  // Tick the ETA countdown down each second; reset whenever a new ETA arrives.
  useEffect(() => {
    if (eta == null) {
      setRemaining(null);
      return;
    }
    setRemaining(eta.etaSeconds);
    const t = setInterval(() => {
      setRemaining((prev) => (prev == null ? null : Math.max(0, prev - 1)));
    }, 1000);
    return () => clearInterval(t);
  }, [eta]);

  const tracking = TRACKING_STATES.includes(status);
  const currentIndex = STATUS_FLOW.indexOf(status);

  return (
    <div className="space-y-4">
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

      {tracking && (
        <div className="rounded-xl border border-gray-200 p-4">
          {eta ? (
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Arriving in
                </p>
                <p className="text-2xl font-bold">
                  {formatEta(remaining ?? eta.etaSeconds)}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDistance(eta.distanceMeters)} away · {eta.label}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  eta.trafficAware
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {eta.trafficAware ? "Traffic-aware" : "Estimate"}
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Waiting for rider location…</p>
          )}
        </div>
      )}

      {status !== "CANCELLED" && (
        <DeliveryMap pickup={pickup} dest={dest} rider={rider} />
      )}
    </div>
  );
}
