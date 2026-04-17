import './RevealButton.css';

interface RevealButtonProps {
  revealed: boolean;
  onReveal: () => void;
  onReset: () => void;
  totalPlayers: number;
  votedCount: number;
}

export function RevealButton({ revealed, onReveal, onReset, totalPlayers, votedCount }: RevealButtonProps) {
  return (
    <div className="reveal-controls">
      {!revealed ? (
        <>
          <div className="reveal-controls__progress">
            <span className="reveal-controls__progress-text">
              {votedCount}/{totalPlayers} votaram
            </span>
            <div className="reveal-controls__bar">
              <div
                className="reveal-controls__bar-fill"
                style={{ width: totalPlayers > 0 ? `${(votedCount / totalPlayers) * 100}%` : '0%' }}
              />
            </div>
          </div>
          <button
            className="btn btn--primary btn--lg"
            onClick={onReveal}
            disabled={votedCount === 0}
          >
            🃏 Revelar cartas
          </button>
        </>
      ) : (
        <button className="btn btn--outline btn--lg" onClick={onReset}>
          🔄 Nova rodada
        </button>
      )}
    </div>
  );
}
