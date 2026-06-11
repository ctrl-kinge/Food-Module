import { requireRole } from "@/lib/auth-guard";
import CustomerHeader from "@/components/CustomerHeader";
import ActiveOrderBanner from "@/components/ActiveOrderBanner";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("CUSTOMER");
  return (
    <div className="min-h-screen">
      <CustomerHeader />
      <ActiveOrderBanner customerId={session.user.id} />
      {children}
    </div>
  );
}
