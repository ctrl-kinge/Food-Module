import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";

/** Returns the current session's user, or null if not authenticated. */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

/**
 * Server-side guard for role-scoped routes. Redirects to /login when not
 * authenticated, or to the home page when the role does not match.
 */
export async function requireRole(role: Role) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== role) {
    redirect("/");
  }
  return session;
}
