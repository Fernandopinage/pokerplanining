import './Card.css';

interface CardProps {
  value: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function Card({ value, selected, disabled, onClick }: CardProps) {
  return (
    <button
      className={`card${selected ? ' card--selected' : ''}${disabled ? ' card--disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
    >
      <span className="card__value">{value}</span>
    </button>
  );
}
