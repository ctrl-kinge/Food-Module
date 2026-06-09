import { createServer } from "http";
import { Server } from "socket.io";

/**
 * Standalone Socket.IO server.
 *
 * Phase 0 skeleton — the realtime contract (FOOD_DELIVERY_ROADMAP.md §4) is
 * wired up in Phase 3/4. Run with: `npm run socket`.
 *
 * Rooms: one per order, named `order:{orderId}`.
 * Events: rider:location, order:eta, order:status, order:assigned.
 */
const PORT = Number(process.env.SOCKET_PORT ?? 4000);

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: process.env.NEXTAUTH_URL ?? "http://localhost:3000" },
});

io.on("connection", (socket) => {
  // Phase 3: socket.join(`order:${orderId}`) + relay status/location/eta.
  socket.on("disconnect", () => {
    /* no-op until Phase 3 */
  });
});

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[socket] Socket.IO server listening on :${PORT}`);
});
