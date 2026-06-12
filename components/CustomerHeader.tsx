import Link from "next/link";
import CartButton from "@/components/CartButton";
import NotificationBell from "@/components/NotificationBell";
import SignOutButton from "@/components/SignOutButton";

export default function CustomerHeader() {
  return (
    <header className="border-b border-gray-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/restaurants" className="text-lg font-bold">
          Food<span className="text-brand-600">Delivery</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/restaurants"
            className="text-gray-700 hover:text-brand-600"
          >
            Restaurants
          </Link>
          <Link href="/orders" className="text-gray-700 hover:text-brand-600">
            Orders
          </Link>
          <CartButton />
          <NotificationBell />
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
