import { requireRole } from "@/lib/auth-guard";

export default async function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("RIDER");
  return <>{children}</>;
}
