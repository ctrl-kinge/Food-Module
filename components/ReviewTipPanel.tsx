"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StarRating from "@/components/StarRating";
import { formatPrice } from "@/lib/format";
import { toast } from "@/lib/toast";

const TIP_PRESETS = [0, 100, 200, 500];

function TipChooser({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (cents: number) => void;
}) {
  const isCustom = !TIP_PRESETS.includes(value);
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {TIP_PRESETS.map((cents) => (
          <button
            key={cents}
            type="button"
            onClick={() => onChange(cents)}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              value === cents
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-surface-border hover:border-brand-500"
            }`}
          >
            {cents === 0 ? "No tip" : formatPrice(cents)}
          </button>
        ))}
        <input
          type="number"
          min={0}
          step="0.5"
          placeholder="Custom $"
          value={isCustom && value > 0 ? (value / 100).toString() : ""}
          onChange={(e) => {
            const dollars = parseFloat(e.target.value);
            onChange(Number.isFinite(dollars) ? Math.round(dollars * 100) : 0);
          }}
          className="w-24 rounded-md border border-surface-border px-2 py-1 text-sm outline-none focus:border-brand-500"
        />
      </div>
    </div>
  );
}

export default function ReviewTipPanel({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [restaurantRating, setRestaurantRating] = useState(5);
  const [riderRating, setRiderRating] = useState(5);
  const [comment, setComment] = useState("");
  const [riderTip, setRiderTip] = useState(0);
  const [restaurantTip, setRestaurantTip] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/orders/${orderId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantRating,
        riderRating,
        comment: comment.trim() || undefined,
        riderTipCents: riderTip,
        restaurantTipCents: restaurantTip,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not submit review.");
      setSubmitting(false);
      return;
    }
    toast.success("Thanks for your review!");
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-surface-border p-4">
      <h2 className="font-semibold">Rate your delivery</h2>

      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <div className="space-y-3">
          <StarRating
            label="Restaurant"
            value={restaurantRating}
            onChange={setRestaurantRating}
          />
          <TipChooser
            label="Tip the restaurant"
            value={restaurantTip}
            onChange={setRestaurantTip}
          />
        </div>
        <div className="space-y-3">
          <StarRating
            label="Rider"
            value={riderRating}
            onChange={setRiderRating}
          />
          <TipChooser
            label="Tip the rider"
            value={riderTip}
            onChange={setRiderTip}
          />
        </div>
      </div>

      <label className="mt-4 block text-sm font-medium">
        Comment (optional)
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-surface-border px-3 py-2 font-normal outline-none focus:border-brand-500"
          placeholder="How was it?"
        />
      </label>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="mt-4 w-full rounded-md bg-brand-600 px-4 py-2.5 font-medium text-surface-deep hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit review & tips"}
      </button>
    </div>
  );
}
