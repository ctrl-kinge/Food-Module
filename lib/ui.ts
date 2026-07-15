export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

/** Join class fragments, dropping falsy values. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition disabled:opacity-50 disabled:pointer-events-none";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand-500 text-surface-deep hover:bg-brand-700",
  secondary: "border border-surface-border bg-surface-raised text-ink hover:border-brand-500",
  ghost: "text-ink-secondary hover:bg-surface-raised",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
};

export function buttonClasses(
  opts: { variant?: ButtonVariant; size?: ButtonSize } = {},
): string {
  const { variant = "primary", size = "md" } = opts;
  return cn(BASE, VARIANTS[variant], SIZES[size]);
}
