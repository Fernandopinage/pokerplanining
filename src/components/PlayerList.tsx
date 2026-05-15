import type { Player } from '../context/RoomContext';
import './PlayerList.css';

interface PlayerListProps {
  players: Player[];
  revealed: boolean;
  myId: string;
  onStartDm?: (playerId: string) => void;
}

export function PlayerList({ players, revealed, myId, onStartDm }: PlayerListProps) {
  return (
    <div className="player-list">
      <h3 className="player-list__title">Jogadores ({players.length})</h3>
      <ul className="player-list__items">
        {players.map((player) => (
          <li
            key={player.id}
            className={`player-item${player.id === myId ? ' player-item--me' : ''}${player.vote !== null ? ' player-item--voted' : ''}`}
          >
            <div className="player-item__info">
              <span className="player-item__avatar">
                {player.name.charAt(0).toUpperCase()}
              </span>
              <span className="player-item__name" title={player.name}>
                {player.name}
                {player.id === myId && <span className="player-item__you"> (você)</span>}
              </span>
            </div>
            <div className="player-item__actions">
              {player.id !== myId && onStartDm && (
                <button
                  className="player-item__chat-btn"
                  onClick={() => onStartDm(player.id)}
                  title={`Chat privado com ${player.name}`}
                  aria-label={`Iniciar chat com ${player.name}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
              )}
              <div className="player-item__vote">
                {revealed ? (
                  <span className={`player-item__card${player.vote !== null ? ' player-item__card--shown' : ''}`}>
                    {player.vote ?? '—'}
                  </span>
                ) : (
                  <span className={`player-item__status${player.vote !== null ? ' player-item__status--voted' : ''}`}>
                    {player.vote !== null ? '✅' : '🤔'}
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
