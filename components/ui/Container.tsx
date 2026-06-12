import { cn } from "@/lib/ui";

const SIZES = { sm: "max-w-3xl", md: "max-w-5xl", lg: "max-w-7xl" } as const;

export default function Container({
  size = "md",
  className,
  children,
}: {
  size?: keyof typeof SIZES;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full px-6 py-8", SIZES[size], className)}>
      {children}
    </div>
  );
}
