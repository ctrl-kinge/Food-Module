export default function LoadingScreen() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-44 animate-pulse rounded bg-surface-raised" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-xl bg-surface-raised" />
        ))}
      </div>
    </div>
  );
}
