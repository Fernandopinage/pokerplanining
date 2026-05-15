import { useEffect, useRef, useState } from 'react';
import './EmojiBar.css';

const EMOJIS = [
  { emoji: '❤️', label: 'Coração' },
  { emoji: '👏', label: 'Aplausos' },
  { emoji: '😂', label: 'Rindo' },
  { emoji: '😢', label: 'Triste' },
  { emoji: '😮', label: 'Surpreso' },
];

interface EmojiBarProps {
  onSend: (emoji: string) => void;
}

export function EmojiBar({ onSend }: EmojiBarProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClick = (emoji: string) => {
    onSend(emoji);
    setOpen(false);
  };

  return (
    <div className="emoji-bar" ref={wrapperRef}>
      {open && (
        <div className="emoji-bar__panel">
          {EMOJIS.map(({ emoji, label }) => (
            <button
              key={label}
              className="emoji-bar__option"
              onClick={() => handleClick(emoji)}
              title={label}
              aria-label={label}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      <button
        className={`emoji-bar__toggle${open ? ' emoji-bar__toggle--open' : ''}`}
        onClick={() => setOpen(prev => !prev)}
        title="Enviar reação"
        aria-label="Enviar reação"
      >
        <span className="emoji-bar__toggle-icon">😊</span>
      </button>
    </div>
  );
}