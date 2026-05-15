import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Chat, type ChatHandle } from '../components/Chat';
import { EmojiBar } from '../components/EmojiBar';
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
  const { roomState, myVote, userName, clearRoom } = useRoom();
  const { sendVote, revealVotes, resetVotes, addStory, setActiveStory, removeStory, leaveRoom, connectionError } = useSocket(roomId, userName);
  const myIdRef = useRef<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const chatRef = useRef<ChatHandle>(null);
  const senderCountRef = useRef<Record<string, number>>({});

  interface FloatingEmoji { uid: string; emoji: string; senderName: string; x: number; duration: number; }
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);

  // Clear stale state only if entering a different room than the currently loaded one.
  // Avoid blanket clearRoom() here — React StrictMode mounts twice in dev, and clearing
  // after the first mount wipes state that the socket just delivered, causing infinite loading.
  useEffect(() => {
    if (roomState && roomState.roomId !== roomId) {
      clearRoom();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const handleEmojiReaction = ({ emoji, senderName }: { emoji: string; senderName: string }) => {
      const uid = Math.random().toString(36).slice(2);
      const x = 5 + Math.random() * 75;

      // Mais emojis enviados pela mesma pessoa = animação mais rápida (mín 1s, máx 6s)
      const count = senderCountRef.current[senderName] || 0;
      const duration = Math.max(1, 6 - count);

      senderCountRef.current[senderName] = count + 1;
      // Decrementa o contador após 8s para resetar a velocidade
      setTimeout(() => {
        senderCountRef.current[senderName] = Math.max(0, (senderCountRef.current[senderName] || 1) - 1);
      }, 8000);

      setFloatingEmojis(prev => [...prev, { uid, emoji, senderName, x, duration }]);
      setTimeout(() => setFloatingEmojis(prev => prev.filter(e => e.uid !== uid)), duration * 1000 + 150);
    };
    socket.on('connect', handleConnect);
    socket.on('emoji_reaction', handleEmojiReaction);
    return () => {
      socket.off('connect', handleConnect);
      socket.off('emoji_reaction', handleEmojiReaction);
    };
  }, [roomId]);

  // Disconnect and clean up on unmount (navigating away)
  useEffect(() => {
    return () => {
      leaveRoom();
      clearRoom();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!userName) return null;

  if (connectionError) {
    return (
      <div className="room room--loading">
        <RoomHeader roomId={roomId || ''} />
        <div className="room__loader">
          <p style={{ color: 'var(--color-danger, #f87171)', marginBottom: '1rem' }}>
            Não foi possível conectar ao servidor.
          </p>
          <button
            style={{ padding: '0.5rem 1.5rem', cursor: 'pointer' }}
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

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
            onStartDm={(playerId) => chatRef.current?.openDm(playerId)}
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

          {isOwner && (
            <RevealButton
              revealed={roomState.revealed}
              onReveal={revealVotes}
              onReset={resetVotes}
              totalPlayers={roomState.players.length}
              votedCount={votedCount}
            />
          )}
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
      {!isOwner && (
        <Chat
          ref={chatRef}
          roomId={roomState.roomId}
          myId={myId}
          players={roomState.players}
          ownerId={roomState.ownerId}
        />
      )}

      <EmojiBar
        onSend={(emoji) => getSocket(roomState.roomId).emit('emoji_react', { emoji })}
      />

      {/* Floating emoji overlay */}
      <div className="emoji-overlay">
        {floatingEmojis.map(fe => (
          <div key={fe.uid} className="emoji-float" style={{ left: `${fe.x}%`, animationDuration: `${fe.duration}s` }}>
            <span className="emoji-float__emoji">{fe.emoji}</span>
            <span className="emoji-float__name">{fe.senderName}</span>
          </div>
        ))}
      </div>

      <footer className="room-footer">
        <span className="room-footer__text">
          Desenvolvido por Pinagé <span className="room-footer__icon">☠️</span>
          {' '}| v0.{__GIT_COMMITS__} <span className="room-footer__hash">#{__GIT_HASH__}</span>
        </span>
      </footer>
    </div>
  );
}
