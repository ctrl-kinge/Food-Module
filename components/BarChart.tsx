type Bar = { label: string; value: number };

/** Minimal responsive SVG bar chart. */
export default function BarChart({
  bars,
  height = 120,
}: {
  bars: Bar[];
  height?: number;
}) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const barW = 100 / Math.max(1, bars.length);
  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className="h-32 w-full"
      role="img"
      aria-label="Orders per day"
    >
      {bars.map((b, i) => {
        const h = (b.value / max) * (height - 16);
        return (
          <rect
            key={i}
            x={i * barW + barW * 0.15}
            y={height - h}
            width={barW * 0.7}
            height={h}
            rx={0.6}
            className="fill-brand-500"
          >
            <title>{`${b.label}: ${b.value}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}
