import { io, Socket } from 'socket.io-client';

// Determine the server URL for Socket.IO:
// - If VITE_SERVER_URL is set (production / custom deploy), use it.
// - Otherwise, use the same origin as the page so Vite's dev proxy routes
//   /socket.io and /api requests to the backend on port 3001 automatically.
function resolveServerUrl(): string {
    const envUrl = import.meta.env.VITE_SERVER_URL as string | undefined;
    if (envUrl) return envUrl;
    if (typeof window !== 'undefined') return window.location.origin;
    return 'http://localhost:3001';
}

const SERVER_URL = resolveServerUrl();

// REST API base URL – empty string means relative paths, which go through the
// Vite proxy in development and hit the same-origin server in production.
export const API_URL = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? '';

// One socket per room, keyed by roomId.
// Each socket connects to its own namespace (/room-ROOMID) so rooms are
// fully isolated at the protocol level — events never leak between rooms.
const sockets = new Map<string, Socket>();

export function getSocket(roomId: string): Socket {
    if (!sockets.has(roomId)) {
        const socket = io(`${SERVER_URL}/room-${roomId}`, {
            autoConnect: false,
            transports: ['websocket', 'polling'],
        });
        sockets.set(roomId, socket);
    }
    return sockets.get(roomId)!;
}

export function disconnectSocket(roomId: string) {
    const socket = sockets.get(roomId);
    if (socket) {
        socket.disconnect();
        sockets.delete(roomId);
    }
}
