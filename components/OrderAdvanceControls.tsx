"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { NEXT_STATUS, STATUS_LABELS, canCancel } from "@/lib/order-status";
import { getSocket } from "@/lib/socket-client";

export default function OrderAdvanceControls({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = NEXT_STATUS[status];

  async function setStatus(target: OrderStatus) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: target }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Update failed");
      setBusy(false);
      return;
    }
    // Broadcast to anyone watching this order (customer's live tracker).
    try {
      getSocket().emit("status:relay", { orderId, status: target });
    } catch {
      /* hub may be offline; DB is already updated */
    }
    router.refresh();
    setBusy(false);
  }

  if (status === "DELIVERED") {
    return <span className="text-sm font-medium text-green-700">Completed</span>;
  }
  if (status === "CANCELLED") {
    return <span className="text-sm text-gray-500">Cancelled</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {next && (
        <button
          type="button"
          disabled={busy}
          onClick={() => setStatus(next)}
          className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-60"
        >
          {busy ? "Updating…" : `Advance → ${STATUS_LABELS[next]}`}
        </button>
      )}
      {canCancel(status) && (
        <button
          type="button"
          disabled={busy}
          onClick={() => setStatus("CANCELLED")}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:border-red-400 hover:text-red-600 disabled:opacity-60"
        >
          Cancel
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
