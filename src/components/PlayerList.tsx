import type { Player } from '../context/RoomContext';
import './PlayerList.css';

interface PlayerListProps {
  players: Player[];
  revealed: boolean;
  myId: string;
}

export function PlayerList({ players, revealed, myId }: PlayerListProps) {
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
          </li>
        ))}
      </ul>
    </div>
  );
}
