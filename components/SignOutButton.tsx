"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-ink-secondary hover:text-brand-600"
    >
      Sign out
    </button>
  );
}
