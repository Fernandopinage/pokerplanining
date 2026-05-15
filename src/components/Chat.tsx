import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
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
  edited?: boolean;
}

interface ChatProps {
  roomId: string;
  myId: string;
  myName: string;
  players: Player[];
  ownerId: string | null;
}

export interface ChatHandle {
  openDm: (playerId: string) => void;
}

type TabId = 'global' | string;

export const Chat = forwardRef<ChatHandle, Omit<ChatProps, 'myName'>>(
  function Chat({ roomId, myId, players, ownerId }, ref) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [text, setText] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('global');
  const [dmTabs, setDmTabs] = useState<string[]>([]);
  const [tabUnread, setTabUnread] = useState<Record<string, number>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showNewDm, setShowNewDm] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const newDmRef = useRef<HTMLDivElement>(null);

  // Players available as DM targets (no owner, no self)
  const chatPlayers = players.filter(p => p.id !== myId && p.id !== ownerId);

  // Current recipient for send (null = global)
  const recipientId: string | null = activeTab === 'global' ? null : activeTab;

  useEffect(() => {
    const socket = getSocket(roomId);

    const handleMessage = (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);

      const msgTabId: string = msg.isPrivate
        ? (msg.fromId === myId ? (msg.toId ?? 'global') : msg.fromId)
        : 'global';

      // Auto-open DM tab if we receive a private message
      if (msg.isPrivate && msg.fromId !== myId) {
        setDmTabs(prev => prev.includes(msg.fromId) ? prev : [...prev, msg.fromId]);
      }

      // Increment unread counters (use functional updates to read current state)
      setOpen(isOpen => {
        if (!isOpen) setUnread(prev => prev + 1);
        setActiveTab(currentTab => {
          if (!isOpen || currentTab !== msgTabId) {
            setTabUnread(prev => ({
              ...prev,
              [msgTabId]: (prev[msgTabId] || 0) + 1,
            }));
          }
          return currentTab;
        });
        return isOpen;
      });
    };

    const handleEdited = ({ id, text: newText }: { id: string; text: string }) => {
      setMessages(prev =>
        prev.map(m => (m.id === id ? { ...m, text: newText, edited: true } : m))
      );
    };

    const handleDeleted = ({ id }: { id: string }) => {
      setMessages(prev => prev.filter(m => m.id !== id));
    };

    socket.on('chat_message', handleMessage);
    socket.on('chat_edited', handleEdited);
    socket.on('chat_deleted', handleDeleted);

    return () => {
      socket.off('chat_message', handleMessage);
      socket.off('chat_edited', handleEdited);
      socket.off('chat_deleted', handleDeleted);
    };
  }, [roomId, myId]);

  // Auto-scroll on new messages or tab change
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, activeTab]);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  // Close new-DM dropdown on outside click
  useEffect(() => {
    if (!showNewDm) return;
    const handler = (e: MouseEvent) => {
      if (newDmRef.current && !newDmRef.current.contains(e.target as Node)) {
        setShowNewDm(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNewDm]);

  // Expose openDm for external callers (e.g. PlayerList hover button)
  useImperativeHandle(ref, () => ({
    openDm: (playerId: string) => {
      setDmTabs(prev => prev.includes(playerId) ? prev : [...prev, playerId]);
      setOpen(true);
      setActiveTab(playerId);
      setTabUnread(prev => ({ ...prev, [playerId]: 0 }));
      setEditingId(null);
      setShowNewDm(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    },
  }));

  const handleToggle = () => {
    setOpen(prev => {
      if (!prev) {
        setUnread(0);
        setTabUnread(t => ({ ...t, [activeTab]: 0 }));
      }
      return !prev;
    });
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setTabUnread(prev => ({ ...prev, [tabId]: 0 }));
    setEditingId(null);
    setShowNewDm(false);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const handleOpenDm = (playerId: string) => {
    if (!dmTabs.includes(playerId)) setDmTabs(prev => [...prev, playerId]);
    handleTabChange(playerId);
  };

  const handleCloseDmTab = (playerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDmTabs(prev => prev.filter(id => id !== playerId));
    setTabUnread(prev => { const next = { ...prev }; delete next[playerId]; return next; });
    if (activeTab === playerId) setActiveTab('global');
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    getSocket(roomId).emit('chat_send', { text: trimmed, toId: recipientId });
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingId(msg.id);
    setEditText(msg.text);
  };

  const handleConfirmEdit = () => {
    const trimmed = editText.trim();
    if (!trimmed || !editingId) return;
    getSocket(roomId).emit('chat_edit', { id: editingId, text: trimmed });
    setEditingId(null);
    setEditText('');
  };

  const handleCancelEdit = () => { setEditingId(null); setEditText(''); };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleConfirmEdit(); }
    if (e.key === 'Escape') handleCancelEdit();
  };

  const handleDelete = (id: string) => getSocket(roomId).emit('chat_delete', { id });

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name ?? id;

  // Messages visible in the active tab
  const visibleMessages = messages.filter(msg => {
    if (activeTab === 'global') return !msg.isPrivate;
    if (!msg.isPrivate) return false;
    return (
      (msg.fromId === myId && msg.toId === activeTab) ||
      (msg.fromId === activeTab && msg.toId === myId)
    );
  });

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
            <span className="chat-panel__title">💬 Chat da sala</span>
            <button className="chat-panel__close" onClick={() => setOpen(false)} aria-label="Fechar chat">✕</button>
          </div>

          {/* Tabs */}
          <div className="chat-tabs">
            <div className="chat-tabs__list">
              <button
                className={`chat-tab${activeTab === 'global' ? ' chat-tab--active' : ''}`}
                onClick={() => handleTabChange('global')}
              >
                Todos
                {(tabUnread['global'] || 0) > 0 && (
                  <span className="chat-tab__badge">{tabUnread['global'] > 9 ? '9+' : tabUnread['global']}</span>
                )}
              </button>

              {dmTabs.map(playerId => (
                <button
                  key={playerId}
                  className={`chat-tab chat-tab--dm${activeTab === playerId ? ' chat-tab--active' : ''}`}
                  onClick={() => handleTabChange(playerId)}
                  title={`Conversa privada com ${getPlayerName(playerId)}`}
                >
                  <span className="chat-tab__lock" aria-hidden="true">🔒</span>
                  {getPlayerName(playerId)}
                  {(tabUnread[playerId] || 0) > 0 && (
                    <span className="chat-tab__badge">{tabUnread[playerId] > 9 ? '9+' : tabUnread[playerId]}</span>
                  )}
                  <span
                    className="chat-tab__close"
                    role="button"
                    aria-label={`Fechar conversa com ${getPlayerName(playerId)}`}
                    onClick={e => handleCloseDmTab(playerId, e)}
                    title="Fechar"
                  >✕</span>
                </button>
              ))}
            </div>

            {chatPlayers.length > 0 && (
              <div className="chat-new-dm-wrapper" ref={newDmRef}>
                <button
                  className={`chat-tab chat-tab--new${showNewDm ? ' chat-tab--open' : ''}`}
                  onClick={() => setShowNewDm(prev => !prev)}
                  title="Nova conversa privada"
                  aria-label="Iniciar nova conversa privada"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  DM
                </button>
                {showNewDm && (
                  <div className="chat-new-dm-dropdown">
                    <div className="chat-new-dm-dropdown__title">Conversa privada com:</div>
                    {chatPlayers.map(p => (
                      <button
                        key={p.id}
                        className={`chat-new-dm-option${dmTabs.includes(p.id) ? ' chat-new-dm-option--open' : ''}`}
                        onClick={() => handleOpenDm(p.id)}
                      >
                        <span className="chat-new-dm-option__avatar">{p.name.charAt(0).toUpperCase()}</span>
                        {p.name}
                        {dmTabs.includes(p.id) && <span className="chat-new-dm-option__check">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Players Online Strip */}
          {chatPlayers.length > 0 && (
            <div className="chat-players-strip">
              <span className="chat-players-strip__label">Online:</span>
              <div className="chat-players-strip__list">
                {chatPlayers.map(p => {
                  const unreadCount = tabUnread[p.id] || 0;
                  const isActive = activeTab === p.id;
                  return (
                    <button
                      key={p.id}
                      className={`chat-player-pill${isActive ? ' chat-player-pill--active' : ''}${dmTabs.includes(p.id) ? ' chat-player-pill--dm' : ''}`}
                      onClick={() => handleOpenDm(p.id)}
                      title={`Conversa privada com ${p.name}`}
                    >
                      <span className="chat-player-pill__avatar">{p.name.charAt(0).toUpperCase()}</span>
                      <span className="chat-player-pill__name">{p.name}</span>
                      {unreadCount > 0 && (
                        <span className="chat-player-pill__badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="chat-panel__messages">
            {visibleMessages.length === 0 && (
              <div className="chat-panel__empty">
                {activeTab === 'global'
                  ? <><span>Nenhuma mensagem ainda.</span><br /><span>Seja o primeiro a falar!</span></>
                  : <><span>Inicie uma conversa privada</span><br /><span>com <strong>{getPlayerName(activeTab)}</strong></span></>}
              </div>
            )}
            {visibleMessages.map(msg => {
              const isMine = msg.fromId === myId;
              return (
                <div
                  key={msg.id}
                  className={`chat-msg${isMine ? ' chat-msg--mine' : ' chat-msg--theirs'}${msg.isPrivate ? ' chat-msg--private' : ''}`}
                >
                  {!isMine && <span className="chat-msg__author">{msg.fromName}</span>}

                  {editingId === msg.id ? (
                    <div className="chat-msg__edit-row">
                      <input
                        ref={editInputRef}
                        className="chat-msg__edit-input"
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        maxLength={500}
                        aria-label="Editar mensagem"
                      />
                      <div className="chat-msg__edit-actions">
                        <button
                          className="chat-msg__edit-btn chat-msg__edit-btn--confirm"
                          onClick={handleConfirmEdit}
                          disabled={!editText.trim()}
                          title="Salvar (Enter)"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>
                        <button
                          className="chat-msg__edit-btn chat-msg__edit-btn--cancel"
                          onClick={handleCancelEdit}
                          title="Cancelar (Esc)"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="chat-msg__bubble-wrap">
                      <div className="chat-msg__bubble">
                        {msg.text}
                        {msg.edited && <span className="chat-msg__edited"> (editado)</span>}
                      </div>
                      {isMine && (
                        <div className="chat-msg__actions">
                          <button
                            className="chat-msg__action-btn"
                            onClick={() => handleStartEdit(msg)}
                            title="Editar mensagem"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            className="chat-msg__action-btn chat-msg__action-btn--delete"
                            onClick={() => handleDelete(msg.id)}
                            title="Deletar mensagem"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <span className="chat-msg__time">{formatTime(msg.timestamp)}</span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Footer / Input */}
          <div className="chat-panel__footer">
            <div className="chat-panel__to-hint">
              {activeTab !== 'global' ? (
                <span className="chat-panel__to-hint--private">🔒 Para: <strong>{getPlayerName(activeTab)}</strong></span>
              ) : (
                <span>Para: <strong>Todos</strong></span>
              )}
            </div>
            <div className="chat-panel__input-row">
              <input
                ref={inputRef}
                className="chat-panel__input"
                type="text"
                placeholder={
                  activeTab !== 'global'
                    ? `Mensagem privada para ${getPlayerName(activeTab)}...`
                    : 'Mensagem para todos...'
                }
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
);
