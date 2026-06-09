"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-gray-700 hover:text-orange-600"
    >
      Sign out
    </button>
  );
}
