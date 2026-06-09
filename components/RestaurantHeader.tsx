import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

export default function RestaurantHeader() {
  return (
    <header className="border-b border-gray-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/dashboard" className="text-lg font-bold">
          Food<span className="text-orange-600">Delivery</span>
          <span className="ml-2 text-sm font-normal text-gray-500">
            Restaurant
          </span>
        </Link>
        <SignOutButton />
      </div>
    </header>
  );
}
