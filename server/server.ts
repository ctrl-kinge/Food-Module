import * as dotenv from "dotenv";
dotenv.config();

import { createServer } from "http";
import { Server, type Socket } from "socket.io";
import { computeEta } from "../lib/mapbox";

/**
 * Standalone Socket.IO relay hub.
 *
 * Rooms: one per order, `order:{orderId}`. The hub is a thin relay for status,
 * and computes the traffic-aware ETA for rider location pings. Authoritative DB
 * writes happen in the Next.js API routes. Run: `npm run socket`
 * (or `npm run dev:all` to run web + socket together).
 *
 * Events (see FOOD_DELIVERY_ROADMAP.md §4):
 *   order:join / order:leave   client -> hub   (room membership)
 *   status:relay               client -> hub   -> broadcasts order:status to room
 *   rider:location             rider  -> hub   -> relays rider:location + emits order:eta
 */
// Hosts (Render/Railway) inject PORT; fall back to SOCKET_PORT then 4000 locally.
const PORT = Number(process.env.PORT ?? process.env.SOCKET_PORT ?? 4000);
// In production set CLIENT_ORIGIN to the deployed web URL (for Socket.IO CORS).
const ORIGIN =
  process.env.CLIENT_ORIGIN ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

type RiderPing = {
  orderId?: string;
  lat?: number;
  lng?: number;
  destLat?: number;
  destLng?: number;
};

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, { cors: { origin: ORIGIN } });

io.on("connection", (socket: Socket) => {
  socket.on("order:join", (orderId: string) => {
    if (typeof orderId === "string" && orderId) socket.join(`order:${orderId}`);
  });

  socket.on("order:leave", (orderId: string) => {
    if (typeof orderId === "string" && orderId) socket.leave(`order:${orderId}`);
  });

  // Restaurant/rider advanced the status (already persisted via the API) —
  // fan it out to everyone watching this order.
  socket.on("status:relay", (data: { orderId?: string; status?: string }) => {
    if (!data?.orderId || !data?.status) return;
    io.to(`order:${data.orderId}`).emit("order:status", {
      orderId: data.orderId,
      status: data.status,
    });
  });

  // Rider GPS ping: relay the position to watchers, then recompute the
  // traffic-aware ETA (rider -> destination) and broadcast it.
  socket.on("rider:location", async (data: RiderPing) => {
    const { orderId, lat, lng, destLat, destLng } = data ?? {};
    if (
      !orderId ||
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      typeof destLat !== "number" ||
      typeof destLng !== "number"
    ) {
      return;
    }

    const room = `order:${orderId}`;
    io.to(room).emit("rider:location", { orderId, lat, lng, ts: Date.now() });

    const eta = await computeEta({ lat, lng }, { lat: destLat, lng: destLng });
    io.to(room).emit("order:eta", {
      orderId,
      etaSeconds: eta.etaSeconds,
      distanceMeters: eta.distanceMeters,
      trafficAware: eta.trafficAware,
      label: eta.label,
    });
  });

  socket.on("disconnect", () => {
    /* rooms are cleaned up automatically */
  });
});

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[socket] Socket.IO relay hub listening on :${PORT}`);
});
