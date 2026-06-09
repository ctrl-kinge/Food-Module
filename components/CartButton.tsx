"use client";

import Link from "next/link";
import { useCart, cartCount } from "@/lib/cart";
import { useHasMounted } from "@/lib/useHasMounted";

export default function CartButton() {
  const items = useCart((s) => s.items);
  const mounted = useHasMounted();
  const count = mounted ? cartCount(items) : 0;

  return (
    <Link
      href="/checkout"
      className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 hover:border-orange-500"
    >
      Cart
      {count > 0 && (
        <span className="ml-1 rounded-full bg-orange-600 px-1.5 text-xs font-semibold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
