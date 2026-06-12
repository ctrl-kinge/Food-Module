import { buttonClasses, cn, type ButtonVariant, type ButtonSize } from "@/lib/ui";
import Spinner from "./Spinner";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export default function Button({
  variant,
  size,
  loading = false,
  className,
  disabled,
  children,
  ...rest
}: Props) {
  return (
    <button
      className={cn(buttonClasses({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
