import Link from "next/link";
import Rating from "@/components/Rating";

type RestaurantCardProps = {
  id: string;
  name: string;
  address: string;
  imageUrl: string | null;
  avgRating: number;
  menuCount: number;
  reviewCount: number;
};

export default function RestaurantCard({
  id,
  name,
  address,
  imageUrl,
  avgRating,
  menuCount,
  reviewCount,
}: RestaurantCardProps) {
  return (
    <Link
      href={`/restaurants/${id}`}
      className="group overflow-hidden rounded-xl border border-gray-200 transition hover:border-orange-500 hover:shadow-sm"
    >
      <div className="flex h-32 items-center justify-center bg-gradient-to-br from-orange-100 to-amber-50 text-4xl">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span aria-hidden>🍽️</span>
        )}
      </div>
      <div className="space-y-1 p-4">
        <h2 className="font-semibold group-hover:text-orange-600">{name}</h2>
        <p className="text-sm text-gray-600">{address}</p>
        <div className="flex items-center justify-between pt-1">
          <Rating rating={avgRating} count={reviewCount} />
          <span className="text-xs text-gray-500">{menuCount} items</span>
        </div>
      </div>
    </Link>
  );
}
