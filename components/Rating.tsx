export default function Rating({
  rating,
  count,
}: {
  rating: number;
  count?: number;
}) {
  if (!rating || rating <= 0) {
    return <span className="text-sm text-gray-500">No ratings yet</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span aria-hidden className="text-amber-500">
        ★
      </span>
      <span className="font-medium">{rating.toFixed(1)}</span>
      {typeof count === "number" && count > 0 && (
        <span className="text-gray-500">({count})</span>
      )}
    </span>
  );
}
