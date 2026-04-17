// Cartas de Planning Poker baseadas na sequência de Fibonacci
export const FIBONACCI_CARDS = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'];

export function calculateAverage(votes: (string | null)[]): number | null {
  const numericVotes = votes
    .filter((v): v is string => v !== null && v !== '?' && v !== '☕')
    .map(Number)
    .filter((n) => !isNaN(n));

  if (numericVotes.length === 0) return null;

  const sum = numericVotes.reduce((acc, n) => acc + n, 0);
  return Math.round((sum / numericVotes.length) * 10) / 10;
}

export function getMinMax(votes: (string | null)[]): { min: number | null; max: number | null } {
  const numericVotes = votes
    .filter((v): v is string => v !== null && v !== '?' && v !== '☕')
    .map(Number)
    .filter((n) => !isNaN(n));

  if (numericVotes.length === 0) return { min: null, max: null };

  return {
    min: Math.min(...numericVotes),
    max: Math.max(...numericVotes),
  };
}
