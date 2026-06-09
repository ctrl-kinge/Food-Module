import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

// Augment NextAuth types so `session.user` and the JWT carry id + role.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
