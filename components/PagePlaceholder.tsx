import Link from "next/link";

type PagePlaceholderProps = {
  title: string;
  phase: string;
  description?: string;
};

/**
 * Temporary placeholder used by the Phase 0 scaffold so every route renders.
 * Real screens replace these in their respective phases.
 */
export default function PagePlaceholder({
  title,
  phase,
  description,
}: PagePlaceholderProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">
        {phase}
      </p>
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-gray-600">
        {description ?? "Placeholder page — implemented in a later phase."}
      </p>
      <Link href="/" className="text-orange-600 underline">
        &larr; Back home
      </Link>
    </main>
  );
}
