import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">
        404
      </p>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-sm text-gray-600">
        That page doesn&rsquo;t exist, or you don&rsquo;t have access to it.
      </p>
      <Link
        href="/"
        className="rounded-md bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700"
      >
        Go home
      </Link>
    </main>
  );
}
