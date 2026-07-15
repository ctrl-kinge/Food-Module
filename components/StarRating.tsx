"use client";

export default function StarRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-1 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className="text-2xl leading-none"
          >
            <span className={n <= value ? "text-amber-500" : "text-ink-faint"}>
              ★
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
