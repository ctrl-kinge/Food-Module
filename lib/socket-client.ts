import { io, type Socket } from "socket.io-client";

export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

let socket: Socket | null = null;

/**
 * Browser-side Socket.IO singleton. One shared connection across components.
 * If the hub isn't running, socket.io-client retries quietly in the background
 * and the rest of the app keeps working (status still shows on page refresh).
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: true });
  }
  return socket;
}
