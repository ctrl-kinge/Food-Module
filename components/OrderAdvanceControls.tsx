"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { NEXT_STATUS, STATUS_LABELS, canCancel } from "@/lib/order-status";
import { getSocket } from "@/lib/socket-client";
import { toast } from "@/lib/toast";
import Button from "@/components/ui/Button";

export default function OrderAdvanceControls({
  orderId,
  status,
  showCancel = true,
}: {
  orderId: string;
  status: OrderStatus;
  showCancel?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = NEXT_STATUS[status];

  async function setStatus(target: OrderStatus, extra?: { prepMinutes?: number; reason?: string }) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: target, ...extra }),
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
    toast.success(`Order marked ${STATUS_LABELS[target]}`);
    router.refresh();
    setBusy(false);
  }

  if (status === "DELIVERED") {
    return <span className="text-sm font-medium text-green-700">Completed</span>;
  }
  if (status === "CANCELLED") {
    return <span className="text-sm text-ink-muted">Cancelled</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {next && (
        <Button
          size="sm"
          loading={busy}
          onClick={() => {
            if (next === "ACCEPTED") {
              const raw = window.prompt("Estimated prep time in minutes (optional):");
              const mins = raw ? parseInt(raw, 10) : NaN;
              setStatus(next, Number.isFinite(mins) && mins > 0 ? { prepMinutes: mins } : undefined);
            } else {
              setStatus(next);
            }
          }}
        >{`Advance → ${STATUS_LABELS[next]}`}</Button>
      )}
      {showCancel && canCancel(status) && (
        <Button
          size="sm"
          variant="secondary"
          loading={busy}
          onClick={() => {
            const reason = window.prompt("Reason for rejecting (optional):") ?? undefined;
            setStatus("CANCELLED", reason ? { reason } : undefined);
          }}
        >Reject</Button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
