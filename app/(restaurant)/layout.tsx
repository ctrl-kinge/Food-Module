import { requireRole } from "@/lib/auth-guard";

export default async function RestaurantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("RESTAURANT");
  return <>{children}</>;
}
