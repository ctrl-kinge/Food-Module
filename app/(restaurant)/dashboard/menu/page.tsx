import { getCurrentUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { Container, PageHeader, EmptyState } from "@/components/ui";
import MenuManager from "@/components/MenuManager";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const user = await getCurrentUser();
  const restaurant = user
    ? await prisma.restaurant.findUnique({
        where: { ownerId: user.id },
        include: { menu: { orderBy: [{ category: "asc" }, { name: "asc" }] } },
      })
    : null;

  return (
    <Container size="sm">
      <PageHeader
        title="Menu"
        subtitle="Add, edit, and toggle the dishes customers can order."
      />
      {!restaurant ? (
        <div className="mt-6">
          <EmptyState message="No restaurant is linked to this account yet." />
        </div>
      ) : (
        <div className="mt-6">
          <MenuManager
            isOpen={restaurant.isOpen}
            items={restaurant.menu.map((m) => ({
              id: m.id,
              name: m.name,
              description: m.description,
              priceCents: m.priceCents,
              category: m.category,
              available: m.available,
            }))}
          />
        </div>
      )}
    </Container>
  );
}
