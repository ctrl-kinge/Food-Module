import type { Role } from "@prisma/client";

/** Where each role lands after authenticating. */
export const ROLE_HOME: Record<Role, string> = {
  CUSTOMER: "/restaurants",
  RIDER: "/rider/orders",
  RESTAURANT: "/dashboard",
  ADMIN: "/",
};

/** Roles a visitor may self-register as (ADMIN is excluded). */
export const SELF_SIGNUP_ROLES = ["CUSTOMER", "RIDER", "RESTAURANT"] as const;
export type SignupRole = (typeof SELF_SIGNUP_ROLES)[number];
