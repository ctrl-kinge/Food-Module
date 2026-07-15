"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ROLE_HOME, SELF_SIGNUP_ROLES, type SignupRole } from "@/lib/roles";
import { Card, Button } from "@/components/ui";

const ROLE_LABELS: Record<SignupRole, string> = {
  CUSTOMER: "Customer — order food",
  RIDER: "Rider — deliver orders",
  RESTAURANT: "Restaurant — manage orders",
};

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<SignupRole>("CUSTOMER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        phone: phone || undefined,
        role,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Registration failed.");
      setLoading(false);
      return;
    }

    // Auto-login after successful registration.
    const login = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });
    if (!login || login.error) {
      router.push("/login");
      return;
    }
    router.push(ROLE_HOME[role]);
    router.refresh();
  }

  return (
    <main id="main-content" className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="text-3xl font-bold">Create account</h1>
        <p className="mt-1 text-sm text-ink-secondary">Pick the role you need.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Name
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full rounded-md border border-surface-border px-3 py-2 text-sm focus-visible:border-brand-500"
              autoComplete="name"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-md border border-surface-border px-3 py-2 text-sm focus-visible:border-brand-500"
              autoComplete="email"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Password
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-md border border-surface-border px-3 py-2 text-sm focus-visible:border-brand-500"
              autoComplete="new-password"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Phone (optional)
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="block w-full rounded-md border border-surface-border px-3 py-2 text-sm focus-visible:border-brand-500"
              autoComplete="tel"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Role
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as SignupRole)}
              className="block w-full rounded-md border border-surface-border px-3 py-2 text-sm focus-visible:border-brand-500"
            >
              {SELF_SIGNUP_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" loading={loading}>
            {loading ? "Creating…" : "Create account"}
          </Button>
        </form>
      </Card>

      <p className="text-sm text-ink-secondary">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-600 underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
