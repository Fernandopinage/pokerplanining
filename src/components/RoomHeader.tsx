import { useState } from 'react';
import './RoomHeader.css';

interface RoomHeaderProps {
  roomId: string;
  onStoriesClick?: () => void;
}

export function RoomHeader({ roomId, onStoriesClick }: RoomHeaderProps) {
  const [copied, setCopied] = useState(false);

  const roomUrl = `${window.location.origin}/room/${roomId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = roomUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Theme toggle
  const [theme, setTheme] = useState(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.body.classList.toggle('dark', next === 'dark');
  };

  return (
    <div className="room-header">
      <div className="room-header__brand">
        <span className="room-header__logo">⚔️</span>
        <span className="room-header__title">Battle Poker</span>
      </div>
      <div className="room-header__room">
        <span className="room-header__label">Sala:</span>
        <code className="room-header__id">{roomId}</code>
        <button className="room-header__copy-btn" onClick={handleCopy} title="Copiar link da sala">
          {copied ? '✓ Copiado!' : '🔗 Copiar link'}
        </button>
        <button className="room-header__theme-btn" onClick={toggleTheme} title="Alternar tema claro/escuro" aria-label="Alternar tema claro/escuro">
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
        {onStoriesClick && (
          <button
            className="room-header__stories-btn"
            onClick={onStoriesClick}
            title="Gerenciar histórias"
          >
            + Histórias
          </button>
        )}
      </div>
    </div>
  );
}
