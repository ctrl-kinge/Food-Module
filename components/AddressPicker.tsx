"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MbMap, Marker as MbMarker } from "mapbox-gl";

export type DeliveryAddress = { address: string; lat: number; lng: number };

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Map starts here (Nairobi CBD) so the customer can drag the pin straight away.
const NAIROBI = { lat: -1.2921, lng: 36.8219 };

const PRESETS: { label: string; address: string; lat: number; lng: number }[] = [
  { label: "Nairobi CBD", address: "Kimathi Street, Nairobi CBD", lat: -1.2841, lng: 36.8233 },
  { label: "Westlands", address: "Westlands Road, Nairobi", lat: -1.2649, lng: 36.8047 },
  { label: "Kilimani", address: "Ngong Road, Kilimani, Nairobi", lat: -1.2987, lng: 36.7825 },
  { label: "Karen", address: "Karen Road, Nairobi", lat: -1.3192, lng: 36.7085 },
];

export default function AddressPicker({
  onChange,
}: {
  onChange: (a: DeliveryAddress) => void;
}) {
  if (MAPBOX_TOKEN) {
    return <MapPicker token={MAPBOX_TOKEN} onChange={onChange} />;
  }
  return <FallbackPicker onChange={onChange} />;
}

/* --------------------- Interactive Mapbox pin picker --------------------- */

type Feature = { id: string; place_name: string; center: [number, number] };

async function reverseGeocode(
  lng: number,
  lat: number,
  token: string,
): Promise<string> {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&limit=1&types=address,poi,place,locality,neighborhood`;
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as { features?: Feature[] };
      const name = data.features?.[0]?.place_name;
      if (name) return name;
    }
  } catch {
    /* fall through to coordinates */
  }
  return `Pinned location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}

function MapPicker({
  token,
  onChange,
}: {
  token: string;
  onChange: (a: DeliveryAddress) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MbMap | null>(null);
  const markerRef = useRef<MbMarker | null>(null);
  const moveSeq = useRef(0);

  const [selected, setSelected] = useState<DeliveryAddress | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Feature[]>([]);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a stable, always-current commit fn for the map's native event handlers.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  /** Set the selection from an explicit address (search result / preset). */
  const commit = useCallback(
    (a: DeliveryAddress, moveMap = false) => {
      setSelected(a);
      setQuery(a.address);
      onChangeRef.current(a);
      if (moveMap && mapRef.current && markerRef.current) {
        markerRef.current.setLngLat([a.lng, a.lat]);
        mapRef.current.flyTo({
          center: [a.lng, a.lat],
          zoom: Math.max(mapRef.current.getZoom(), 14),
        });
      }
    },
    [],
  );

  /** Set the selection from a pin position (reverse-geocode the address). */
  const commitFromPoint = useCallback(
    async (lng: number, lat: number) => {
      const seq = ++moveSeq.current;
      const address = await reverseGeocode(lng, lat, token);
      if (seq !== moveSeq.current) return; // a newer move superseded this one
      setSelected({ address, lat, lng });
      setQuery(address);
      onChangeRef.current({ address, lat, lng });
    },
    [token],
  );
  const commitFromPointRef = useRef(commitFromPoint);
  commitFromPointRef.current = commitFromPoint;

  // Create the interactive map once.
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
        center: [NAIROBI.lng, NAIROBI.lat],
        zoom: 12,
      });
      mapRef.current = map;

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      });
      map.addControl(geolocate, "top-right");

      const marker = new mapboxgl.Marker({ color: "#ea580c", draggable: true })
        .setLngLat([NAIROBI.lng, NAIROBI.lat])
        .addTo(map);
      markerRef.current = marker;

      map.on("load", () => {
        map.resize();
        // Seed the selection from the starting pin so the order can proceed;
        // the customer drags it to their exact spot from there.
        commitFromPointRef.current(NAIROBI.lng, NAIROBI.lat);
      });

      // Tap the map → move the pin there.
      map.on("click", (e) => {
        marker.setLngLat(e.lngLat);
        commitFromPointRef.current(e.lngLat.lng, e.lngLat.lat);
      });

      // Drag the pin → update on release.
      marker.on("dragend", () => {
        const ll = marker.getLngLat();
        commitFromPointRef.current(ll.lng, ll.lat);
      });

      // "Locate me" → drop the pin on the device's position.
      geolocate.on("geolocate", (ev) => {
        const c = (ev as unknown as GeolocationPosition).coords;
        if (!c) return;
        marker.setLngLat([c.longitude, c.latitude]);
        commitFromPointRef.current(c.longitude, c.latitude);
      });

      cleanup = () => map.remove();
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Debounced forward search for the address box.
  useEffect(() => {
    if (query.trim().length < 3 || selected?.address === query) {
      setResults([]);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query,
        )}.json?access_token=${token}&limit=5&proximity=36.8219,-1.2921&types=address,poi,place,locality,neighborhood`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = (await res.json()) as { features?: Feature[] };
        setResults(data.features ?? []);
        setOpen(true);
      } catch {
        /* ignore network errors; user can retry */
      }
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, token, selected]);

  function choose(f: Feature) {
    const [lng, lat] = f.center;
    commit({ address: f.place_name, lat, lng }, true);
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Drag the pin or tap the map to set your exact delivery spot.
      </p>

      <div
        ref={containerRef}
        className="h-64 w-full overflow-hidden rounded-xl border border-gray-200"
      />

      {selected && (
        <p className="text-sm text-gray-700">
          <span className="font-medium">Delivering to:</span> {selected.address}
        </p>
      )}

      <div className="relative">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Or search for an address
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Start typing a street, place, or area…"
            className="rounded-md border border-gray-300 px-3 py-2 font-normal outline-none focus:border-brand-500"
            autoComplete="off"
          />
        </label>
        {open && results.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
            {results.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => choose(f)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50"
                >
                  {f.place_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="text-sm font-medium">Quick pick</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() =>
                commit({ address: p.address, lat: p.lat, lng: p.lng }, true)
              }
              className={`rounded-full border px-3 py-1 text-sm transition ${
                selected?.address === p.address
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-300 hover:border-brand-500"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----------------- Token-free fallback (presets + manual) ---------------- */

function FallbackPicker({
  onChange,
}: {
  onChange: (a: DeliveryAddress) => void;
}) {
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  function sync(next: { address?: string; lat?: string; lng?: string }) {
    const a = next.address ?? address;
    const la = next.lat ?? lat;
    const ln = next.lng ?? lng;
    setAddress(a);
    setLat(la);
    setLng(ln);
    onChange({ address: a.trim(), lat: parseFloat(la), lng: parseFloat(ln) });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Quick pick</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const selected = p.address === address;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() =>
                  sync({
                    address: p.address,
                    lat: p.lat.toString(),
                    lng: p.lng.toString(),
                  })
                }
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  selected
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-gray-300 hover:border-brand-500"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Delivery address
        <input
          type="text"
          value={address}
          onChange={(e) => sync({ address: e.target.value })}
          placeholder="Street, building, area"
          className="rounded-md border border-gray-300 px-3 py-2 font-normal outline-none focus:border-brand-500"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Latitude
          <input
            type="number"
            step="any"
            value={lat}
            onChange={(e) => sync({ lat: e.target.value })}
            placeholder="-1.2841"
            className="rounded-md border border-gray-300 px-3 py-2 font-normal outline-none focus:border-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Longitude
          <input
            type="number"
            step="any"
            value={lng}
            onChange={(e) => sync({ lng: e.target.value })}
            placeholder="36.8233"
            className="rounded-md border border-gray-300 px-3 py-2 font-normal outline-none focus:border-brand-500"
          />
        </label>
      </div>
      <p className="text-xs text-gray-500">
        Pick a location above or enter coordinates. (An interactive map appears
        here when a Mapbox token is configured.)
      </p>
    </div>
  );
}
