"use client";

import { useEffect, useRef, useState } from "react";
import { Card, Button, Badge } from "@/components/ui";
import { toast } from "@/lib/toast";

const PING_MS = 20_000;

export default function RiderAvailability({
  initialOnline,
}: {
  initialOnline: boolean;
}) {
  const [online, setOnline] = useState(initialOnline);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function pushLocation() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        fetch("/api/rider/location", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: p.coords.latitude,
            lng: p.coords.longitude,
          }),
        }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 15_000 },
    );
  }

  // While online, push position now and on an interval; stop when offline.
  useEffect(() => {
    if (!online) {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      return;
    }
    pushLocation();
    timer.current = setInterval(pushLocation, PING_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  async function toggle() {
    setBusy(true);
    const next = !online;
    const res = await fetch("/api/rider/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOnline: next }),
    });
    setBusy(false);
    if (!res.ok) return toast.error("Could not update availability");
    setOnline(next);
    toast.success(next ? "You’re online" : "You’re offline");
  }

  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="font-semibold">
          Availability{" "}
          <Badge tone={online ? "success" : "neutral"}>
            {online ? "Online" : "Offline"}
          </Badge>
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Go online to be auto-assigned nearby orders. We share your location
          only while you&apos;re online.
        </p>
      </div>
      <Button variant={online ? "secondary" : "primary"} loading={busy} onClick={toggle}>
        {online ? "Go offline" : "Go online"}
      </Button>
    </Card>
  );
}
