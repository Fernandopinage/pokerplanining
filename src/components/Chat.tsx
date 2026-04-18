import { useEffect, useRef, useState } from 'react';
import type { Player } from '../context/RoomContext';
import { getSocket } from '../services/socket';
import './Chat.css';

interface ChatMessage {
  id: string;
  fromId: string;
  fromName: string;
  text: string;
  toId: string | null;
  toName: string | null;
  isPrivate: boolean;
  timestamp: number;
}

interface ChatProps {
  roomId: string;
  myId: string;
  myName: string;
  players: Player[];
  ownerId: string | null;
}

export function Chat({ roomId, myId, players, ownerId }: Omit<ChatProps, 'myName'>) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [text, setText] = useState('');
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Other players available as private message targets (no owner, no self)
  const chatPlayers = players.filter(p => p.id !== myId && p.id !== ownerId);

  useEffect(() => {
    const socket = getSocket(roomId);

    const handleMessage = (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
      setUnread(prev => (open ? prev : prev + 1));
    };

    socket.on('chat_message', handleMessage);
    return () => {
      socket.off('chat_message', handleMessage);
    };
  }, [roomId, open]);

  // Auto-scroll to bottom on new messages when open
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  // Reset unread when opening
  const handleToggle = () => {
    setOpen(prev => {
      if (!prev) setUnread(0);
      return !prev;
    });
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const socket = getSocket(roomId);
    socket.emit('chat_send', { text: trimmed, toId: recipientId });
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getRecipientLabel = () => {
    if (!recipientId) return 'Todos';
    const p = players.find(p => p.id === recipientId);
    return p ? p.name : 'Todos';
  };

  return (
    <div className="chat-widget">
      {/* Toggle button */}
      <button
        className={`chat-toggle${unread > 0 ? ' chat-toggle--unread' : ''}`}
        onClick={handleToggle}
        title="Chat da sala"
        aria-label="Abrir/fechar chat"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {unread > 0 && <span className="chat-toggle__badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="chat-panel">
          {/* Header */}
          <div className="chat-panel__header">
            <span className="chat-panel__title">
              💬 Chat da sala
            </span>
            <button className="chat-panel__close" onClick={() => setOpen(false)} aria-label="Fechar chat">✕</button>
          </div>

          {/* Recipient selector */}
          <div className="chat-panel__recipients">
            <span className="chat-panel__recipients-label">Para:</span>
            <div className="chat-panel__recipients-list">
              <button
                className={`chat-recipient-btn${!recipientId ? ' chat-recipient-btn--active' : ''}`}
                onClick={() => setRecipientId(null)}
              >
                Todos
              </button>
              {chatPlayers.map(p => (
                <button
                  key={p.id}
                  className={`chat-recipient-btn${recipientId === p.id ? ' chat-recipient-btn--active chat-recipient-btn--private' : ''}`}
                  onClick={() => setRecipientId(prev => prev === p.id ? null : p.id)}
                  title={`Mensagem privada para ${p.name}`}
                >
                  {p.name}
                  <span className="chat-recipient-btn__lock" title="Privado">🔒</span>
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="chat-panel__messages">
            {messages.length === 0 && (
              <div className="chat-panel__empty">Nenhuma mensagem ainda.<br />Seja o primeiro a falar!</div>
            )}
            {messages.map(msg => {
              const isMine = msg.fromId === myId;
              const isVisible =
                !msg.isPrivate ||
                msg.fromId === myId ||
                msg.toId === myId;

              if (!isVisible) return null;

              return (
                <div
                  key={msg.id}
                  className={`chat-msg ${isMine ? 'chat-msg--mine' : 'chat-msg--theirs'} ${msg.isPrivate ? 'chat-msg--private' : ''}`}
                >
                  {!isMine && (
                    <span className="chat-msg__author">{msg.fromName}</span>
                  )}
                  {msg.isPrivate && (
                    <span className="chat-msg__private-label">
                      {isMine
                        ? `🔒 privado para ${msg.toName}`
                        : `🔒 privado`}
                    </span>
                  )}
                  <div className="chat-msg__bubble">{msg.text}</div>
                  <span className="chat-msg__time">{formatTime(msg.timestamp)}</span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="chat-panel__footer">
            <div className="chat-panel__to-hint">
              {recipientId ? (
                <span className="chat-panel__to-hint--private">🔒 Para: <strong>{getRecipientLabel()}</strong></span>
              ) : (
                <span>Para: <strong>Todos</strong></span>
              )}
            </div>
            <div className="chat-panel__input-row">
              <input
                ref={inputRef}
                className="chat-panel__input"
                type="text"
                placeholder={recipientId ? `Mensagem privada para ${getRecipientLabel()}...` : 'Mensagem para todos...'}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={500}
              />
              <button
                className="chat-panel__send"
                onClick={handleSend}
                disabled={!text.trim()}
                aria-label="Enviar mensagem"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
