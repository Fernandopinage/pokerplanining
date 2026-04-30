import { io, Socket } from 'socket.io-client';

// In development, VITE_SERVER_URL points to the backend directly (http://localhost:3001).
// In production (Vercel), it is empty so the socket connects to the same origin and
// the serverless function handles it. Fallback keeps local dev working even when the
// env var is missing.
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

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
