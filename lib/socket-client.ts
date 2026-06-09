// Browser-side Socket.IO client factory.
//
// Phase 0 stub. In Phase 3 this connects to the Socket.IO server and exposes
// helpers to join an `order:{orderId}` room and subscribe to the events from
// the realtime contract (rider:location, order:eta, order:status, ...).

export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

export {};
