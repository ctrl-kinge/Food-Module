export default function EmptyState({
  icon = "🍽️",
  message,
  action,
}: {
  icon?: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-surface-border p-8 text-center">
      <div className="text-3xl" aria-hidden>
        {icon}
      </div>
      <p className="mt-2 text-sm text-ink-secondary">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
