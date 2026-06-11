"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket-client";

/** Joins the dashboard room and re-fetches the server data on each update. */
export default function DashboardLive() {
  const router = useRouter();
  const [live, setLive] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    const join = () => {
      setLive(true);
      socket.emit("dashboard:join");
    };
    const onDisconnect = () => setLive(false);
    const onRefresh = () => router.refresh();

    socket.on("connect", join);
    socket.on("disconnect", onDisconnect);
    socket.on("dashboard:refresh", onRefresh);
    if (socket.connected) join();

    return () => {
      socket.off("connect", join);
      socket.off("disconnect", onDisconnect);
      socket.off("dashboard:refresh", onRefresh);
    };
  }, [router]);

  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-500">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          live ? "bg-green-500" : "bg-gray-300"
        }`}
      />
      {live ? "Live" : "Connecting…"}
    </span>
  );
}
