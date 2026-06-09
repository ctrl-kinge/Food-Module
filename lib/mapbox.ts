// Mapbox helpers: traffic-aware ETA via the Directions API (driving-traffic
// profile), with a Haversine fallback when no token is configured.
//
// Phase 0 stub. The real implementation arrives in Phase 4. The Haversine
// fallback below is already usable and documented per the roadmap's ETA note.

const EARTH_RADIUS_M = 6_371_000;
const ASSUMED_SPEED_MPS = 8.33; // ~30 km/h city driving

export type EtaResult = {
  etaSeconds: number;
  distanceMeters: number;
  /** true when derived from Mapbox traffic data, false for the fallback. */
  trafficAware: boolean;
  label: string;
};

/** Great-circle distance between two coordinates, in meters. */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Offline ETA fallback used when MAPBOX_TOKEN is absent. */
export function fallbackEta(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): EtaResult {
  const distanceMeters = haversineMeters(from, to);
  return {
    distanceMeters,
    etaSeconds: Math.round(distanceMeters / ASSUMED_SPEED_MPS),
    trafficAware: false,
    label: "estimate (no live traffic)",
  };
}

type LngLat = { lat: number; lng: number };

/**
 * Traffic-aware ETA via the Mapbox Directions API (driving-traffic profile).
 * Falls back to the Haversine estimate when no MAPBOX_TOKEN is set or the
 * request fails. Server-side only (uses the secret MAPBOX_TOKEN).
 */
export async function computeEta(from: LngLat, to: LngLat): Promise<EtaResult> {
  const token = process.env.MAPBOX_TOKEN;
  if (!token) return fallbackEta(from, to);

  try {
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coords}?overview=false&access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) return fallbackEta(from, to);
    const data = (await res.json()) as {
      routes?: { duration: number; distance: number }[];
    };
    const route = data.routes?.[0];
    if (!route) return fallbackEta(from, to);
    return {
      etaSeconds: Math.round(route.duration),
      distanceMeters: Math.round(route.distance),
      trafficAware: true,
      label: "live traffic",
    };
  } catch {
    return fallbackEta(from, to);
  }
}
