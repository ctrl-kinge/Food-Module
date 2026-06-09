import { createServer } from "http";
import { Server, type Socket } from "socket.io";

/**
 * Standalone Socket.IO relay hub.
 *
 * Rooms: one per order, `order:{orderId}`. The hub is a thin relay — the
 * authoritative DB writes happen in the Next.js API routes. Run: `npm run socket`
 * (or `npm run dev:all` to run web + socket together).
 *
 * Events (see FOOD_DELIVERY_ROADMAP.md §4):
 *   order:join / order:leave   client -> hub   (room membership)
 *   status:relay               client -> hub   -> broadcasts order:status to room
 *   rider:location             rider  -> hub   -> (Phase 4) ETA + relay to room
 */
const PORT = Number(process.env.SOCKET_PORT ?? 4000);
const ORIGIN = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

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
  socket.on(
    "status:relay",
    (data: { orderId?: string; status?: string }) => {
      if (!data?.orderId || !data?.status) return;
      io.to(`order:${data.orderId}`).emit("order:status", {
        orderId: data.orderId,
        status: data.status,
      });
    },
  );

  socket.on("disconnect", () => {
    /* rooms are cleaned up automatically */
  });
});

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[socket] Socket.IO relay hub listening on :${PORT}`);
});
