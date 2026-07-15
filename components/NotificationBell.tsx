"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

type Item = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

const POLL_MS = 30_000;

export default function NotificationBell() {
  const { status } = useSession();
  const authed = status === "authenticated";
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    if (!authed) return;
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      /* ignore transient errors */
    }
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    load();
    const t = setInterval(load, POLL_MS);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [authed, load]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markAll() {
    await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
    setUnread(0);
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  }

  if (!authed) return null;

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-1.5 text-ink-secondary hover:bg-surface-raised focus-visible:outline-none"
      >
        <span aria-hidden className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-surface-deep">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-surface-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-surface-border px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="text-xs text-brand-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-auto">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-ink-muted">
                No notifications yet.
              </li>
            ) : (
              items.map((n) => (
                <li
                  key={n.id}
                  className={`border-b border-surface-border px-3 py-2 ${
                    n.read ? "" : "bg-brand-50"
                  }`}
                >
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-ink-secondary">{n.body}</p>
                  <p className="mt-0.5 text-[10px] text-ink-faint">
                    {new Date(n.createdAt).toLocaleString("en-US")}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
