import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// All seed accounts share this password for easy local testing.
const DEMO_PASSWORD = "password123";

async function main() {
  // Dev-only reset, in foreign-key-safe order.
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash(DEMO_PASSWORD, 10);

  await prisma.user.createMany({
    data: [
      { name: "Casey Customer", email: "customer@example.com", password, role: "CUSTOMER", phone: "+254700000001" },
      { name: "Rhea Rider", email: "rider1@example.com", password, role: "RIDER", phone: "+254700000002" },
      { name: "Riku Rider", email: "rider2@example.com", password, role: "RIDER", phone: "+254700000003" },
      { name: "Rosa Restaurant", email: "restaurant@example.com", password, role: "RESTAURANT", phone: "+254700000004" },
    ],
  });

  const owner = await prisma.user.findUniqueOrThrow({
    where: { email: "restaurant@example.com" },
  });

  const restaurants = [
    {
      name: "Mama's Kitchen",
      address: "Kimathi Street, Nairobi CBD",
      lat: -1.2841,
      lng: 36.8233,
      ownerId: owner.id,
      menu: [
        { name: "Nyama Choma Platter", description: "Grilled beef with kachumbari", priceCents: 1200, category: "Mains" },
        { name: "Ugali & Sukuma", description: "Cornmeal with sautéed greens", priceCents: 500, category: "Mains" },
        { name: "Pilau & Kuku", description: "Spiced rice with chicken", priceCents: 850, category: "Mains" },
        { name: "Mandazi (4)", description: "Lightly sweet fried dough", priceCents: 300, category: "Sides" },
      ],
    },
    {
      name: "Bella Napoli",
      address: "Westlands Road, Nairobi",
      lat: -1.2649,
      lng: 36.8047,
      ownerId: null,
      menu: [
        { name: "Margherita Pizza", description: "Tomato, mozzarella, basil", priceCents: 950, category: "Pizza" },
        { name: "Pepperoni Pizza", description: "Loaded with pepperoni", priceCents: 1150, category: "Pizza" },
        { name: "Spaghetti Carbonara", description: "Egg, pancetta, pecorino", priceCents: 1050, category: "Pasta" },
        { name: "Tiramisu", description: "Classic coffee dessert", priceCents: 600, category: "Dessert" },
      ],
    },
    {
      name: "Sushi Zen",
      address: "Ngong Road, Nairobi",
      lat: -1.2987,
      lng: 36.7825,
      ownerId: null,
      menu: [
        { name: "Salmon Nigiri (2)", description: "Fresh salmon over rice", priceCents: 700, category: "Sushi" },
        { name: "California Roll (8)", description: "Crab, avocado, cucumber", priceCents: 900, category: "Sushi" },
        { name: "Chicken Teriyaki Bowl", description: "Grilled chicken, steamed rice", priceCents: 1100, category: "Bowls" },
        { name: "Miso Soup", description: "Tofu, seaweed, scallion", priceCents: 350, category: "Sides" },
      ],
    },
  ];

  for (const r of restaurants) {
    await prisma.restaurant.create({
      data: {
        name: r.name,
        address: r.address,
        lat: r.lat,
        lng: r.lng,
        ownerId: r.ownerId,
        menu: { create: r.menu },
      },
    });
  }

  console.log(
    `Seeded ${restaurants.length} restaurants and 4 users (password: "${DEMO_PASSWORD}").`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
