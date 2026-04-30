import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoomState } from '../context/RoomContext';
import { useRoom } from '../context/RoomContext';
import { disconnectSocket, getSocket } from '../services/socket';

export function useSocket(roomId: string | undefined, name: string) {
    const { setRoomState, setMyVote } = useRoom();
    const joinedRef = useRef(false);
    const [connectionError, setConnectionError] = useState(false);
    const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!roomId || !name) return;

        setConnectionError(false);
        if (errorTimerRef.current) {
            clearTimeout(errorTimerRef.current);
            errorTimerRef.current = null;
        }

        // Each room has its own namespace socket — fully isolated channel
        const socket = getSocket(roomId);

        const handleRoomUpdate = (state: RoomState) => {
            if (errorTimerRef.current) {
                clearTimeout(errorTimerRef.current);
                errorTimerRef.current = null;
            }
            setConnectionError(false);
            setRoomState(state);
        };

        const handleError = (err: { message: string }) => {
            console.error('[Socket error]', err.message);
            if (err.message.toLowerCase().includes('sala não encontrada') ||
                err.message.toLowerCase().includes('sala nao encontrada')) {
                window.alert('Sala não encontrada. Você será redirecionado.');
                window.location.href = '/';
            }
        };

        const handleConnectError = (err: Error) => {
            console.error('[Socket connect_error]', err.message);
            // Only flag error after 12 s of continuous failure — socket.io retries automatically
            if (!errorTimerRef.current) {
                errorTimerRef.current = setTimeout(() => {
                    setConnectionError(true);
                }, 12000);
            }
        };

        socket.on('room_update', handleRoomUpdate);
        socket.on('error', handleError);
        socket.on('connect_error', handleConnectError);

        const doJoin = () => {
            if (errorTimerRef.current) {
                clearTimeout(errorTimerRef.current);
                errorTimerRef.current = null;
            }
            setConnectionError(false);
            // roomId comes from the namespace — only name is needed here
            socket.emit('join_room', { name });
            joinedRef.current = true;
        };

        if (!socket.connected) {
            socket.on('connect', doJoin);
            socket.connect();
        } else if (!joinedRef.current) {
            doJoin();
        }

        // Emit leave_room when the user closes/refreshes the tab
        const handleBeforeUnload = () => {
            if (socket.connected) {
                socket.emit('leave_room');
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            socket.off('room_update', handleRoomUpdate);
            socket.off('error', handleError);
            socket.off('connect_error', handleConnectError);
            socket.off('connect', doJoin);
            if (errorTimerRef.current) {
                clearTimeout(errorTimerRef.current);
                errorTimerRef.current = null;
            }
            joinedRef.current = false;
        };
    }, [roomId, name, setRoomState]);

    const sendVote = useCallback(
        (vote: string) => {
            if (!roomId) return;
            const socket = getSocket(roomId);
            socket.emit('vote', { vote });
            setMyVote(vote);
        },
        [roomId, setMyVote]
    );

    const revealVotes = useCallback(() => {
        if (!roomId) return;
        getSocket(roomId).emit('reveal_votes');
    }, [roomId]);

    const resetVotes = useCallback(() => {
        if (!roomId) return;
        getSocket(roomId).emit('reset_votes');
        setMyVote(null);
    }, [roomId, setMyVote]);

    const addStory = useCallback((title: string, description: string) => {
        if (!roomId) return;
        getSocket(roomId).emit('add_story', { title, description });
    }, [roomId]);

    const setActiveStory = useCallback((storyId: string) => {
        if (!roomId) return;
        getSocket(roomId).emit('set_active_story', { storyId });
    }, [roomId]);

    const removeStory = useCallback((storyId: string) => {
        if (!roomId) return;
        getSocket(roomId).emit('remove_story', { storyId });
    }, [roomId]);

    // Explicit leave (e.g. navigate away programmatically)
    const leaveRoom = useCallback(() => {
        if (!roomId) return;
        const socket = getSocket(roomId);
        if (socket.connected) socket.emit('leave_room');
        disconnectSocket(roomId);
    }, [roomId]);

    return { sendVote, revealVotes, resetVotes, addStory, setActiveStory, removeStory, leaveRoom, connectionError };
}
