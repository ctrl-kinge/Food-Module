"use client";

import { useState } from "react";

export type DeliveryAddress = { address: string; lat: number; lng: number };

// Token-free fallback for choosing a delivery location (no Mapbox key needed).
// Phase 4 layers a Mapbox geocoder/map pin on top of this.
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
        Pick a location above or enter coordinates. Map-based address search
        arrives in Phase 4 (needs a Mapbox token).
      </p>
    </div>
  );
}
