"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { toast } from "@/lib/toast";
import type { DeliveryAddress } from "@/components/AddressPicker";

type Saved = {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  isDefault: boolean;
};

export default function SavedAddresses({
  current,
  onSelect,
}: {
  current: DeliveryAddress | null;
  onSelect: (a: DeliveryAddress) => void;
}) {
  const [items, setItems] = useState<Saved[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/addresses");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveCurrent() {
    if (!current || !current.address) return;
    const label = window.prompt("Save this address as (e.g. Home, Work):");
    if (!label || !label.trim()) return;
    const res = await fetch("/api/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: label.trim(),
        address: current.address,
        lat: current.lat,
        lng: current.lng,
      }),
    });
    if (!res.ok) return toast.error("Could not save address");
    toast.success("Address saved");
    load();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this saved address?")) return;
    const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Could not delete address");
    load();
  }

  // Which saved address (if any) matches the currently chosen delivery address.
  const activeSaved =
    current && current.address
      ? items.find(
          (a) =>
            a.address === current.address &&
            a.lat === current.lat &&
            a.lng === current.lng,
        )
      : undefined;

  return (
    <div>
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {items.map((a) => (
            <li key={a.id}>
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-sm">
                <button
                  type="button"
                  onClick={() =>
                    onSelect({ address: a.address, lat: a.lat, lng: a.lng })
                  }
                  className="font-medium text-gray-800 hover:text-brand-600"
                >
                  {a.label}
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${a.label}`}
                  onClick={() => remove(a.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {activeSaved && (
        <p className="mt-2 text-xs text-gray-600">
          Delivering to saved address:{" "}
          <span className="font-medium">{activeSaved.label}</span>
        </p>
      )}
      {current && current.address && !activeSaved && (
        <div className="mt-2">
          <Button variant="ghost" size="sm" onClick={saveCurrent}>
            Save current address
          </Button>
        </div>
      )}
    </div>
  );
}
