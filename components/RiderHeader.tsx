import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

export default function RiderHeader() {
  return (
    <header className="border-b border-gray-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/rider/orders" className="text-lg font-bold">
          Food<span className="text-brand-600">Delivery</span>
          <span className="ml-2 text-sm font-normal text-gray-500">Rider</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/rider/orders"
            className="text-gray-700 hover:text-brand-600"
          >
            My deliveries
          </Link>
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
