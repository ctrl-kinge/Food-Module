import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";
import SignOutButton from "@/components/SignOutButton";

export default function RestaurantHeader() {
  return (
    <header className="border-b border-gray-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-bold">
            Food<span className="text-brand-600">Delivery</span>
            <span className="ml-2 text-sm font-normal text-gray-500">
              Restaurant
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-gray-700 hover:text-brand-600">
              Orders
            </Link>
            <Link
              href="/dashboard/menu"
              className="text-gray-700 hover:text-brand-600"
            >
              Menu
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
