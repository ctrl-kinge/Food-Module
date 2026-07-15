import { formatPrice } from "@/lib/format";

function Stars({ value }: { value: number }) {
  return (
    <span className="text-amber-500" aria-label={`${value} of 5`}>
      {"★".repeat(value)}
      <span className="text-ink-faint">{"★".repeat(5 - value)}</span>
    </span>
  );
}

export default function ReviewSummary({
  restaurantRating,
  riderRating,
  comment,
  riderTipCents,
  restaurantTipCents,
}: {
  restaurantRating: number;
  riderRating: number;
  comment: string | null;
  riderTipCents: number;
  restaurantTipCents: number;
}) {
  return (
    <div className="rounded-xl border border-surface-border p-4">
      <h2 className="font-semibold">Your review</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-sm text-ink-muted">Restaurant</p>
          <Stars value={restaurantRating} />
          <p className="mt-1 text-xs text-ink-muted">
            Tip: {formatPrice(restaurantTipCents)}
          </p>
        </div>
        <div>
          <p className="text-sm text-ink-muted">Rider</p>
          <Stars value={riderRating} />
          <p className="mt-1 text-xs text-ink-muted">
            Tip: {formatPrice(riderTipCents)}
          </p>
        </div>
      </div>
      {comment && (
        <p className="mt-3 text-sm text-ink-secondary">&ldquo;{comment}&rdquo;</p>
      )}
      <p className="mt-3 text-xs text-ink-faint">Thanks for your feedback!</p>
    </div>
  );
}
