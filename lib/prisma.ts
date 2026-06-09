// Prisma client singleton.
//
// Phase 0 stub: the generated client does not exist until the schema is
// defined and `prisma generate` is run in Phase 1. To keep the Phase 0 build
// green without a database, this exports a placeholder. Replace the body in
// Phase 1 with the real singleton:
//
//   import { PrismaClient } from "@prisma/client";
//   const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
//   export const prisma = globalForPrisma.prisma ?? new PrismaClient();
//   if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const prisma = null as unknown;
