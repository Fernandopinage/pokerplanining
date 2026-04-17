import { useCallback, useEffect, useRef } from 'react';
import type { RoomState } from '../context/RoomContext';
import { useRoom } from '../context/RoomContext';
import { getSocket } from '../services/socket';

export function useSocket(roomId: string | undefined, name: string) {
    const { setRoomState, setMyVote } = useRoom();
    const joinedRef = useRef(false);

    useEffect(() => {
        if (!roomId || !name) return;

        const socket = getSocket();

        const handleRoomUpdate = (state: RoomState) => {
            setRoomState(state);
        };

        const handleError = (err: { message: string }) => {
            console.error('[Socket error]', err.message);
        };

        socket.on('room_update', handleRoomUpdate);
        socket.on('error', handleError);

        const doJoin = () => {
            socket.emit('join_room', { roomId, name });
            joinedRef.current = true;
        };

        if (!socket.connected) {
            socket.once('connect', doJoin);
            socket.connect();
        } else if (!joinedRef.current) {
            doJoin();
        }

        return () => {
            socket.off('room_update', handleRoomUpdate);
            socket.off('error', handleError);
            socket.off('connect', doJoin);
            joinedRef.current = false;
        };
    }, [roomId, name, setRoomState]);

    const sendVote = useCallback(
        (vote: string) => {
            const socket = getSocket();
            socket.emit('vote', { vote });
            setMyVote(vote);
        },
        [setMyVote]
    );

    const revealVotes = useCallback(() => {
        const socket = getSocket();
        socket.emit('reveal_votes');
    }, []);

    const resetVotes = useCallback(() => {
        const socket = getSocket();
        socket.emit('reset_votes');
        setMyVote(null);
    }, [setMyVote]);

    const addStory = useCallback((title: string, description: string) => {
        const socket = getSocket();
        socket.emit('add_story', { title, description });
    }, []);

    const setActiveStory = useCallback((storyId: string) => {
        const socket = getSocket();
        socket.emit('set_active_story', { storyId });
    }, []);

    const removeStory = useCallback((storyId: string) => {
        const socket = getSocket();
        socket.emit('remove_story', { storyId });
    }, []);

    return { sendVote, revealVotes, resetVotes, addStory, setActiveStory, removeStory };
}
