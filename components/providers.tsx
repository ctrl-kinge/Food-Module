"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import Toaster from "@/components/Toaster";
import PushRegistrar from "@/components/PushRegistrar";

/** Client-side context providers shared across the app. */
export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
        <PushRegistrar />
      </QueryClientProvider>
    </SessionProvider>
  );
}
