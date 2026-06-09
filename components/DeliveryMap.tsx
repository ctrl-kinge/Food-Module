"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import type { Map as MbMap, Marker as MbMarker } from "mapbox-gl";

export type MapPoint = { lat: number; lng: number; label: string };

type DeliveryMapProps = {
  pickup: MapPoint;
  dest: MapPoint;
  rider?: { lat: number; lng: number } | null;
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function DeliveryMap(props: DeliveryMapProps) {
  if (MAPBOX_TOKEN) {
    return <MapboxMap {...props} token={MAPBOX_TOKEN} />;
  }
  return <FallbackMap {...props} />;
}

/* ------------------------------ Mapbox map ------------------------------- */

function MapboxMap({
  pickup,
  dest,
  rider,
  token,
}: DeliveryMapProps & { token: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MbMap | null>(null);
  const riderMarkerRef = useRef<MbMarker | null>(null);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !containerRef.current) return;

      mapboxgl.accessToken = token;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [pickup.lng, pickup.lat],
        zoom: 12,
      });
      mapRef.current = map;

      map.on("load", () => {
        new mapboxgl.Marker({ color: "#2563eb" })
          .setLngLat([pickup.lng, pickup.lat])
          .setPopup(new mapboxgl.Popup().setText(pickup.label))
          .addTo(map);
        new mapboxgl.Marker({ color: "#16a34a" })
          .setLngLat([dest.lng, dest.lat])
          .setPopup(new mapboxgl.Popup().setText(dest.label))
          .addTo(map);

        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([pickup.lng, pickup.lat]);
        bounds.extend([dest.lng, dest.lat]);
        map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
      });

      cleanup = () => map.remove();
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [pickup.lat, pickup.lng, dest.lat, dest.lng, pickup.label, dest.label, token]);

  // Move the rider marker as new positions arrive.
  useEffect(() => {
    if (!rider) return;
    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (!mapRef.current) return;
      if (!riderMarkerRef.current) {
        riderMarkerRef.current = new mapboxgl.Marker({ color: "#ea580c" })
          .setLngLat([rider.lng, rider.lat])
          .addTo(mapRef.current);
      } else {
        riderMarkerRef.current.setLngLat([rider.lng, rider.lat]);
      }
    })();
  }, [rider]);

  return <div ref={containerRef} className="h-64 w-full rounded-xl" />;
}

/* ---------------------- Token-free SVG fallback map ---------------------- */

function FallbackMap({ pickup, dest, rider }: DeliveryMapProps) {
  const points = [
    { ...pickup, kind: "pickup" as const },
    { ...dest, kind: "dest" as const },
    ...(rider ? [{ ...rider, label: "Rider", kind: "rider" as const }] : []),
  ];

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs);
  let maxLng = Math.max(...lngs);

  const latSpan = Math.max(maxLat - minLat, 0.005);
  const lngSpan = Math.max(maxLng - minLng, 0.005);
  minLat -= latSpan * 0.2;
  maxLat += latSpan * 0.2;
  minLng -= lngSpan * 0.2;
  maxLng += lngSpan * 0.2;

  const W = 100;
  const H = 100;
  const project = (p: { lat: number; lng: number }) => ({
    x: ((p.lng - minLng) / (maxLng - minLng)) * W,
    y: (1 - (p.lat - minLat) / (maxLat - minLat)) * H,
  });

  const p = project(pickup);
  const d = project(dest);
  const r = rider ? project(rider) : null;

  const COLORS = { pickup: "#2563eb", dest: "#16a34a", rider: "#ea580c" };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-slate-50 to-slate-100">
      <svg viewBox="0 0 100 100" className="h-64 w-full" role="img" aria-label="Delivery map preview">
        <line x1={p.x} y1={p.y} x2={d.x} y2={d.y} stroke="#cbd5e1" strokeWidth={0.6} strokeDasharray="2 2" />
        {r && (
          <line x1={r.x} y1={r.y} x2={d.x} y2={d.y} stroke={COLORS.rider} strokeWidth={0.8} />
        )}
        {([
          { pt: p, kind: "pickup" as const, label: pickup.label },
          { pt: d, kind: "dest" as const, label: dest.label },
          ...(r ? [{ pt: r, kind: "rider" as const, label: "Rider" }] : []),
        ]).map((m) => (
          <g key={m.kind}>
            {m.kind === "rider" && (
              <circle cx={m.pt.x} cy={m.pt.y} r={4} fill={COLORS.rider} opacity={0.25}>
                <animate attributeName="r" values="3;6;3" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={m.pt.x} cy={m.pt.y} r={2.2} fill={COLORS[m.kind]} stroke="white" strokeWidth={0.6} />
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap gap-3 border-t border-gray-200 px-3 py-2 text-xs">
        <Legend color={COLORS.pickup} label={`Pickup · ${pickup.label}`} />
        <Legend color={COLORS.dest} label={`Drop-off · ${dest.label}`} />
        {rider && <Legend color={COLORS.rider} label="Rider" />}
        <span className="ml-auto text-gray-400">Map preview — add a Mapbox token for a full map</span>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-gray-600">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
