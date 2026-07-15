import Link from "next/link";
import Rating from "@/components/Rating";
import { Badge } from "@/components/ui";

type RestaurantCardProps = {
  id: string;
  name: string;
  address: string;
  imageUrl: string | null;
  isOpen: boolean;
  avgRating: number;
  menuCount: number;
  reviewCount: number;
};

export default function RestaurantCard({
  id,
  name,
  address,
  imageUrl,
  isOpen,
  avgRating,
  menuCount,
  reviewCount,
}: RestaurantCardProps) {
  return (
    <Link
      href={`/restaurants/${id}`}
      className="group block overflow-hidden rounded-xl border border-surface-border bg-surface shadow-sm transition hover:border-brand-500 hover:shadow-md"
    >
      <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-brand-100 to-amber-50 text-4xl">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden>🍽️</span>
        )}
        {!isOpen && (
          <span className="absolute right-2 top-2">
            <Badge tone="danger">Closed</Badge>
          </span>
        )}
      </div>
      <div className="space-y-1 p-4">
        <h2 className="font-semibold group-hover:text-brand-600">{name}</h2>
        <p className="text-sm text-ink-secondary">{address}</p>
        <div className="flex items-center justify-between pt-1">
          <Rating rating={avgRating} count={reviewCount} />
          <span className="text-xs text-ink-muted">{menuCount} items</span>
        </div>
      </div>
    </Link>
  );
}
