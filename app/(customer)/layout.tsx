import { requireRole } from "@/lib/auth-guard";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("CUSTOMER");
  return <>{children}</>;
}
