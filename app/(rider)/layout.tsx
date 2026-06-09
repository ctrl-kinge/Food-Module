import { requireRole } from "@/lib/auth-guard";
import RiderHeader from "@/components/RiderHeader";

export default async function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("RIDER");
  return (
    <div className="min-h-screen">
      <RiderHeader />
      {children}
    </div>
  );
}
