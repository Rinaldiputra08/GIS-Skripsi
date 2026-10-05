/**
 * Converts a 0 - 1 raw TOPSIS preference score into a clean 0 - 100 Business Score
 */
export function formatBusinessScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score * 100)));
}

/**
 * Converts a 0 - 1 score into a 1 to 5 Star Rating
 */
export function getStarRating(score: number): number {
  if (score >= 0.70) return 5;
  if (score >= 0.58) return 4;
  if (score >= 0.45) return 3;
  if (score >= 0.35) return 2;
  return 1;
}

