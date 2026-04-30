import { io, Socket } from 'socket.io-client';

// Determine the server URL dynamically:
// - If VITE_SERVER_URL is set (production / custom deploy), use it.
// - Otherwise, connect to port 3001 on the same hostname as the current page.
//   This handles both localhost and LAN access (e.g. http://192.168.1.5:5173 → http://192.168.1.5:3001).
function resolveServerUrl(): string {
    const envUrl = import.meta.env.VITE_SERVER_URL as string | undefined;
    if (envUrl) return envUrl;
    if (typeof window === 'undefined') return 'http://localhost:3001';
    return `${window.location.protocol}//${window.location.hostname}:3001`;
}

const SERVER_URL = resolveServerUrl();

// One socket per room, keyed by roomId.
// Each socket connects to its own namespace (/room-ROOMID) so rooms are
// fully isolated at the protocol level — events never leak between rooms.
const sockets = new Map<string, Socket>();

export function getSocket(roomId: string): Socket {
    if (!sockets.has(roomId)) {
        const socket = io(`${SERVER_URL}/room-${roomId}`, {
            autoConnect: false,
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

export const API_URL = SERVER_URL;
