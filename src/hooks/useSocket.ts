import { useCallback, useEffect, useRef } from 'react';
import type { RoomState } from '../context/RoomContext';
import { useRoom } from '../context/RoomContext';
import { disconnectSocket, getSocket } from '../services/socket';

export function useSocket(roomId: string | undefined, name: string) {
    const { setRoomState, setMyVote } = useRoom();
    const joinedRef = useRef(false);

    useEffect(() => {
        if (!roomId || !name) return;

        // Each room has its own namespace socket — fully isolated channel
        const socket = getSocket(roomId);

        const handleRoomUpdate = (state: RoomState) => {
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

        socket.on('room_update', handleRoomUpdate);
        socket.on('error', handleError);

        const doJoin = () => {
            // roomId comes from the namespace — only name is needed here
            socket.emit('join_room', { name });
            joinedRef.current = true;
        };

        if (!socket.connected) {
            socket.once('connect', doJoin);
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
            socket.off('connect', doJoin);
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

    return { sendVote, revealVotes, resetVotes, addStory, setActiveStory, removeStory, leaveRoom };
}
