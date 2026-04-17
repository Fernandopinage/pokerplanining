import React, { createContext, useCallback, useContext, useState } from 'react';

export interface Player {
  id: string;
  name: string;
  vote: string | null;
}

export interface Story {
  id: string;
  title: string;
  description: string;
  score: string | null;
}

export interface RoomState {
  roomId: string;
  revealed: boolean;
  players: Player[];
  ownerId: string | null;
  stories: Story[];
  currentStoryId: string | null;
}

interface RoomContextType {
  roomState: RoomState | null;
  setRoomState: (state: RoomState) => void;
  myVote: string | null;
  setMyVote: (vote: string | null) => void;
  userName: string;
  setUserName: (name: string) => void;
  clearRoom: () => void;
}

const RoomContext = createContext<RoomContextType | null>(null);

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const [roomState, setRoomStateInternal] = useState<RoomState | null>(null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [userName, setUserName] = useState('');

  const setRoomState = useCallback((state: RoomState) => {
    setRoomStateInternal(state);
  }, []);

  const clearRoom = useCallback(() => {
    setRoomStateInternal(null);
    setMyVote(null);
  }, []);

  return (
    <RoomContext.Provider
      value={{ roomState, setRoomState, myVote, setMyVote, userName, setUserName, clearRoom }}
    >
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be used within RoomProvider');
  return ctx;
}
