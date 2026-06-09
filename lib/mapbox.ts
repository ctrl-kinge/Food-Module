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
