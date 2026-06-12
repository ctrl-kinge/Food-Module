"use client";

import { useState, type FormEvent } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ROLE_HOME } from "@/lib/roles";
import { Card, Button } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (!res || res.error) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    const session = await getSession();
    const role = session?.user?.role;
    router.push(role ? ROLE_HOME[role] : "/");
    router.refresh();
  }

  return (
    <main id="main-content" className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-3xl font-bold">Log in</h1>
        <p className="mt-1 text-sm text-gray-600">
          Customer, rider, or restaurant.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:border-brand-500"
              autoComplete="email"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:border-brand-500"
              autoComplete="current-password"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" loading={loading}>
            {loading ? "Signing in…" : "Log in"}
          </Button>
        </form>
      </Card>

      <p className="text-sm text-gray-600">
        No account?{" "}
        <Link href="/register" className="text-brand-600 underline">
          Create one
        </Link>
      </p>
    </main>
  );
}
