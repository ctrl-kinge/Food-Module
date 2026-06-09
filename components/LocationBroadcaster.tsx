"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket-client";

type LngLat = { lat: number; lng: number };

const GPS_THROTTLE_MS = 10_000;
const SIM_STEP_MS = 1_500;
const SIM_STEPS = 18;

export default function LocationBroadcaster({
  orderId,
  pickup,
  dest,
}: {
  orderId: string;
  pickup: LngLat;
  dest: LngLat;
}) {
  const [mode, setMode] = useState<"off" | "gps" | "sim">("off");
  const [pos, setPos] = useState<LngLat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const watchId = useRef<number | null>(null);
  const simTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastEmit = useRef(0);

  function emit(p: LngLat) {
    setPos(p);
    try {
      getSocket().emit("rider:location", {
        orderId,
        lat: p.lat,
        lng: p.lng,
        destLat: dest.lat,
        destLng: dest.lng,
      });
    } catch {
      /* hub offline; ignore */
    }
  }

  function stopAll() {
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (simTimer.current) {
      clearInterval(simTimer.current);
      simTimer.current = null;
    }
    setMode("off");
  }

  // Clean up on unmount.
  useEffect(() => stopAll, []);

  function startGps() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Geolocation not available in this browser.");
      return;
    }
    stopAll();
    setMode("gps");
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        const now = Date.now();
        if (now - lastEmit.current < GPS_THROTTLE_MS) return;
        lastEmit.current = now;
        emit({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
  }

  function startSim() {
    setError(null);
    stopAll();
    setMode("sim");
    let step = 0;
    emit(pickup);
    simTimer.current = setInterval(() => {
      step += 1;
      const t = Math.min(step / SIM_STEPS, 1);
      emit({
        lat: pickup.lat + (dest.lat - pickup.lat) * t,
        lng: pickup.lng + (dest.lng - pickup.lng) * t,
      });
      if (t >= 1 && simTimer.current) {
        clearInterval(simTimer.current);
        simTimer.current = null;
        setMode("off");
      }
    }, SIM_STEP_MS);
  }

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <h2 className="font-semibold">Share your location</h2>
      <p className="mt-1 text-sm text-gray-600">
        The customer sees your position and ETA live while you deliver.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {mode === "off" ? (
          <>
            <button
              type="button"
              onClick={startGps}
              className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
            >
              Share real GPS
            </button>
            <button
              type="button"
              onClick={startSim}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:border-orange-500"
            >
              Simulate drive
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={stopAll}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:border-red-400 hover:text-red-600"
          >
            Stop {mode === "gps" ? "sharing" : "simulation"}
          </button>
        )}
      </div>

      {pos && (
        <p className="mt-3 text-xs text-gray-500">
          Broadcasting: {pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}
          {mode === "sim" && " (simulated)"}
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
