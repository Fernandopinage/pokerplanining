import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PlayerList } from '../components/PlayerList';
import { ResultsSummary } from '../components/ResultsSummary';
import { RevealButton } from '../components/RevealButton';
import { RoomHeader } from '../components/RoomHeader';
import { StoriesDrawer } from '../components/StoriesDrawer';
import { StoryPanel } from '../components/StoryPanel';
import { VotingBoard } from '../components/VotingBoard';
import { useRoom } from '../context/RoomContext';
import { useSocket } from '../hooks/useSocket';
import { getSocket } from '../services/socket';
import './Room.css';

export function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { roomState, myVote, userName } = useRoom();
  const { sendVote, revealVotes, resetVotes, addStory, setActiveStory, removeStory, leaveRoom } = useSocket(roomId, userName);
  const myIdRef = useRef<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!userName) {
      navigate(`/?room=${roomId}`);
      return;
    }
  }, [userName, roomId, navigate]);

  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket(roomId);
    myIdRef.current = socket.id || '';
    const handleConnect = () => {
      myIdRef.current = socket.id || '';
    };
    socket.on('connect', handleConnect);
    return () => {
      socket.off('connect', handleConnect);
    };
  }, [roomId]);

  // Disconnect and clean up on unmount (navigating away)
  useEffect(() => {
    return () => {
      leaveRoom();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!userName) return null;

  if (!roomState) {
    return (
      <div className="room room--loading">
        <RoomHeader roomId={roomId || ''} />
        <div className="room__loader">
          <div className="spinner" />
          <p>Conectando à sala...</p>
        </div>
      </div>
    );
  }

  const myId = roomId ? (getSocket(roomId).id || '') : '';
  const isOwner = roomState.ownerId === myId;
  const votedCount = roomState.players.filter((p) => p.vote !== null).length;
  const currentStory = roomState.stories.find((s) => s.id === roomState.currentStoryId) ?? null;

  return (
    <div className="room">
      <RoomHeader roomId={roomState.roomId} onStoriesClick={() => setDrawerOpen(true)} />

      <div className="room__body">
        <aside className="room__sidebar">
          <PlayerList
            players={roomState.players}
            revealed={roomState.revealed}
            myId={myId}
          />
        </aside>

        <main className="room__main">
          <StoryPanel story={currentStory} />

          {roomState.revealed && (
            <ResultsSummary players={roomState.players} />
          )}

          <VotingBoard
            selectedVote={myVote}
            revealed={roomState.revealed}
            onVote={sendVote}
          />

          <RevealButton
            revealed={roomState.revealed}
            onReveal={revealVotes}
            onReset={resetVotes}
            totalPlayers={roomState.players.length}
            votedCount={votedCount}
          />
        </main>
      </div>

      <StoriesDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        stories={roomState.stories}
        currentStoryId={roomState.currentStoryId}
        isOwner={isOwner}
        onAddStory={addStory}
        onSetActive={setActiveStory}
        onRemove={removeStory}
      />
      <footer className="room-footer">
        <span className="room-footer__text">
          Desenvolvido por Pinagé <span className="room-footer__icon">☠️</span> | V 0.02
        </span>
      </footer>
    </div>
  );
}
