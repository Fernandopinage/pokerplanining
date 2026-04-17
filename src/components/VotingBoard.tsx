import { FIBONACCI_CARDS } from '../utils/fibonacci';
import { Card } from './Card';
import './VotingBoard.css';

interface VotingBoardProps {
  selectedVote: string | null;
  revealed: boolean;
  onVote: (vote: string) => void;
}

export function VotingBoard({ selectedVote, revealed, onVote }: VotingBoardProps) {
  return (
    <div className="voting-board">
      <h3 className="voting-board__title">
        {revealed ? 'Votos revelados!' : 'Escolha sua carta'}
      </h3>
      <div className="voting-board__cards">
        {FIBONACCI_CARDS.map((value) => (
          <Card
            key={value}
            value={value}
            selected={selectedVote === value}
            disabled={revealed}
            onClick={() => !revealed && onVote(value)}
          />
        ))}
      </div>
      {!revealed && selectedVote && (
        <p className="voting-board__hint">
          Você votou <strong>{selectedVote}</strong>. Você pode trocar seu voto antes de revelar.
        </p>
      )}
    </div>
  );
}
