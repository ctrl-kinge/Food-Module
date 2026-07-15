import { cn } from "@/lib/ui";

export default function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-surface-border bg-surface p-4 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
