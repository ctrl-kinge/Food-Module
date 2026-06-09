"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClaimButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/orders/${orderId}/assign`, {
      method: "POST",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not claim");
      setBusy(false);
      return;
    }
    router.push(`/rider/orders/${orderId}`);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={claim}
        className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-60"
      >
        {busy ? "Claiming…" : "Claim delivery"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
