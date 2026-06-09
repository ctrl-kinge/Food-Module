import { useEffect, useState } from "react";

/**
 * Returns true only after the component has mounted on the client. Used to gate
 * rendering of persisted (localStorage) cart state so SSR and the first client
 * render match, avoiding hydration mismatches.
 */
export function useHasMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
