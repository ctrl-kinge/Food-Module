"use client";

import { useEffect, useRef, useState } from "react";

export type DeliveryAddress = { address: string; lat: number; lng: number };

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

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
    return <GeocoderPicker token={MAPBOX_TOKEN} onChange={onChange} />;
  }
  return <FallbackPicker onChange={onChange} />;
}

/* ---------------------- Mapbox geocoder (with token) --------------------- */

type Feature = { id: string; place_name: string; center: [number, number] };

function staticMapUrl(a: DeliveryAddress, token: string) {
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ea580c(${a.lng},${a.lat})/${a.lng},${a.lat},13/520x220@2x?access_token=${token}`;
}

function GeocoderPicker({
  token,
  onChange,
}: {
  token: string;
  onChange: (a: DeliveryAddress) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Feature[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DeliveryAddress | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.trim().length < 3 || selected?.address === query) {
      setResults([]);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        // Bias results toward the service area (Nairobi) for better relevance.
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

  function select(a: DeliveryAddress) {
    setSelected(a);
    setQuery(a.address);
    setResults([]);
    setOpen(false);
    onChange(a);
  }

  function choose(f: Feature) {
    const [lng, lat] = f.center;
    select({ address: f.place_name, lat, lng });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Quick pick</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() =>
                select({ address: p.address, lat: p.lat, lng: p.lng })
              }
              className={`rounded-full border px-3 py-1 text-sm transition ${
                selected?.address === p.address
                  ? "border-orange-500 bg-orange-50 text-orange-700"
                  : "border-gray-300 hover:border-orange-500"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Search your address
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Start typing a street, place, or area…"
            className="rounded-md border border-gray-300 px-3 py-2 font-normal outline-none focus:border-orange-500"
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
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-orange-50"
                >
                  {f.place_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={staticMapUrl(selected, token)}
            alt={`Map showing ${selected.address}`}
            className="h-44 w-full object-cover"
          />
          <p className="px-3 py-2 text-sm text-gray-700">{selected.address}</p>
        </div>
      )}
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
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-gray-300 hover:border-orange-500"
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
          className="rounded-md border border-gray-300 px-3 py-2 font-normal outline-none focus:border-orange-500"
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
            className="rounded-md border border-gray-300 px-3 py-2 font-normal outline-none focus:border-orange-500"
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
            className="rounded-md border border-gray-300 px-3 py-2 font-normal outline-none focus:border-orange-500"
          />
        </label>
      </div>
      <p className="text-xs text-gray-500">
        Pick a location above or enter coordinates. (Address search appears here
        when a Mapbox token is configured.)
      </p>
    </div>
  );
}
