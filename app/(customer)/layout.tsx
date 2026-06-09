import { requireRole } from "@/lib/auth-guard";
import CustomerHeader from "@/components/CustomerHeader";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("CUSTOMER");
  return (
    <div className="min-h-screen">
      <CustomerHeader />
      {children}
    </div>
  );
}
