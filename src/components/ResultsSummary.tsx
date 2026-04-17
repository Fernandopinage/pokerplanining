import type { Player } from '../context/RoomContext';
import { calculateAverage, getMinMax } from '../utils/fibonacci';
import './ResultsSummary.css';

interface ResultsSummaryProps {
  players: Player[];
}

export function ResultsSummary({ players }: ResultsSummaryProps) {
  const votes = players.map((p) => p.vote);
  const average = calculateAverage(votes);
  const { min, max } = getMinMax(votes);

  const numericVotes = votes.filter((v): v is string => v !== null && v !== '?' && v !== '☕');
  const hasResults = numericVotes.length > 0;

  if (!hasResults && votes.every((v) => v === null)) return null;

  return (
    <div className="results-summary">
      <h3 className="results-summary__title">Resultado da Rodada</h3>
      <div className="results-summary__stats">
        {average !== null && (
          <div className="results-summary__stat">
            <span className="results-summary__stat-value">{average}</span>
            <span className="results-summary__stat-label">Média</span>
          </div>
        )}
        {min !== null && (
          <div className="results-summary__stat results-summary__stat--min">
            <span className="results-summary__stat-value">{min}</span>
            <span className="results-summary__stat-label">Menor</span>
          </div>
        )}
        {max !== null && (
          <div className="results-summary__stat results-summary__stat--max">
            <span className="results-summary__stat-value">{max}</span>
            <span className="results-summary__stat-label">Maior</span>
          </div>
        )}
      </div>
      {average === null && (
        <p className="results-summary__no-numeric">Sem votos numéricos nesta rodada.</p>
      )}
    </div>
  );
}
