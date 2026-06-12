import { requireRole } from "@/lib/auth-guard";
import RestaurantHeader from "@/components/RestaurantHeader";

export default async function RestaurantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("RESTAURANT");
  return (
    <div className="min-h-screen">
      <RestaurantHeader />
      <main id="main-content">{children}</main>
    </div>
  );
}
