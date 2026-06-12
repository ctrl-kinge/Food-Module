"use client";

import { useToasts, type ToastType } from "@/lib/toast";

const STYLES: Record<ToastType, string> = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-gray-200 bg-white text-gray-800",
};

export default function Toaster() {
  const { toasts, dismiss } = useToasts();

  return (
    <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto w-full max-w-sm rounded-lg border px-4 py-2.5 text-left text-sm shadow-sm ${STYLES[t.type]}`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
