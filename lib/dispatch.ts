import { haversineMeters } from "@/lib/mapbox";

export type RiderCandidate = {
  id: string;
  lastLat: number | null;
  lastLng: number | null;
};

/**
 * Pick the id of the rider nearest to `to`. Riders without a known position are
 * ignored. Returns null when no candidate has coordinates. (Caller is
 * responsible for pre-filtering to online riders.)
 */
export function selectNearestRider(
  to: { lat: number; lng: number },
  riders: RiderCandidate[],
): string | null {
  let best: { id: string; dist: number } | null = null;
  for (const r of riders) {
    if (r.lastLat == null || r.lastLng == null) continue;
    const dist = haversineMeters(to, { lat: r.lastLat, lng: r.lastLng });
    if (!best || dist < best.dist) best = { id: r.id, dist };
  }
  return best?.id ?? null;
}
