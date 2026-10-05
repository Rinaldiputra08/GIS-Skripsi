import { SpatialCandidate, TopsisCandidateResult, TopsisSummary } from './types';

/**
 * Executes the Technique for Order Preference by Similarity to Ideal Solution (TOPSIS)
 * on a dataset of spatial candidate grid points using AHP-derived weights.
 *
 * Criteria Types:
 * - C1 (Dist Competitor): BENEFIT (Larger distance = less competition = better)
 * - C2 (Population): BENEFIT (Higher population = larger market = better)
 * - C3 (Dist Road): COST (Shorter distance to main road = better accessibility = better)
 * - C4 (Dist Crowd): COST (Shorter distance to crowd center = higher foot traffic = better)
 */
export function calculateTopsis(
  candidates: SpatialCandidate[],
  weights: [number, number, number, number] // [w_c1, w_c2, w_c3, w_c4]
): TopsisSummary {
  const startTime = performance.now();
  const m = candidates.length;

  if (m === 0) {
    return {
      candidates: [],
      divisors: [1, 1, 1, 1],
      weights,
      idealPositive: [0, 0, 0, 0],
      idealNegative: [0, 0, 0, 0],
      executionTimeMs: 0,
    };
  }

  // 1. Calculate vector normalization divisors D_j = sqrt(sum(x_ij^2))
  const sumSquares: [number, number, number, number] = [0, 0, 0, 0];
  for (let i = 0; i < m; i++) {
    const c = candidates[i];
    sumSquares[0] += c.c1_dist_competitor * c.c1_dist_competitor;
    sumSquares[1] += c.c2_population * c.c2_population;
    sumSquares[2] += c.c3_dist_road * c.c3_dist_road;
    sumSquares[3] += c.c4_dist_crowd * c.c4_dist_crowd;
  }

  const divisors: [number, number, number, number] = [
    Math.sqrt(sumSquares[0]) || 1,
    Math.sqrt(sumSquares[1]) || 1,
    Math.sqrt(sumSquares[2]) || 1,
    Math.sqrt(sumSquares[3]) || 1,
  ];

  // 2. Compute normalized matrix R (r_ij = x_ij / D_j) and weighted matrix Y (y_ij = w_j * r_ij)
  const normalizedRows: [number, number, number, number][] = [];
  const weightedRows: [number, number, number, number][] = [];

  for (let i = 0; i < m; i++) {
    const c = candidates[i];
    const r: [number, number, number, number] = [
      c.c1_dist_competitor / divisors[0],
      c.c2_population / divisors[1],
      c.c3_dist_road / divisors[2],
      c.c4_dist_crowd / divisors[3],
    ];
    normalizedRows.push(r);

    const y: [number, number, number, number] = [
      weights[0] * r[0],
      weights[1] * r[1],
      weights[2] * r[2],
      weights[3] * r[3],
    ];
    weightedRows.push(y);
  }

  // 3. Determine Positive Ideal Solution (A+) and Negative Ideal Solution (A-)
  // C1 (Benefit): A+ = max, A- = min
  // C2 (Benefit): A+ = max, A- = min
  // C3 (Cost):    A+ = min, A- = max
  // C4 (Cost):    A+ = min, A- = max

  let maxC1 = -Infinity, minC1 = Infinity;
  let maxC2 = -Infinity, minC2 = Infinity;
  let maxC3 = -Infinity, minC3 = Infinity;
  let maxC4 = -Infinity, minC4 = Infinity;

  for (let i = 0; i < m; i++) {
    const y = weightedRows[i];
    if (y[0] > maxC1) maxC1 = y[0];
    if (y[0] < minC1) minC1 = y[0];

    if (y[1] > maxC2) maxC2 = y[1];
    if (y[1] < minC2) minC2 = y[1];

    if (y[2] > maxC3) maxC3 = y[2];
    if (y[2] < minC3) minC3 = y[2];

    if (y[3] > maxC4) maxC4 = y[3];
    if (y[3] < minC4) minC4 = y[3];
  }

  const idealPositive: [number, number, number, number] = [
    maxC1, // C1 (Benefit) -> max
    maxC2, // C2 (Benefit) -> max
    minC3, // C3 (Cost)    -> min
    minC4, // C4 (Cost)    -> min
  ];

  const idealNegative: [number, number, number, number] = [
    minC1, // C1 (Benefit) -> min
    minC2, // C2 (Benefit) -> min
    maxC3, // C3 (Cost)    -> max
    maxC4, // C4 (Cost)    -> max
  ];

  // 4. Calculate Euclidean distances (S_i+ and S_i-) and Preference Score V_i
  const results: TopsisCandidateResult[] = [];

  for (let i = 0; i < m; i++) {
    const y = weightedRows[i];
    const r = normalizedRows[i];

    // S_i+ = sqrt(sum((y_ij - y_j^+)^2))
    const dPlus = Math.sqrt(
      Math.pow(y[0] - idealPositive[0], 2) +
      Math.pow(y[1] - idealPositive[1], 2) +
      Math.pow(y[2] - idealPositive[2], 2) +
      Math.pow(y[3] - idealPositive[3], 2)
    );

    // S_i- = sqrt(sum((y_ij - y_j^-)^2))
    const dMinus = Math.sqrt(
      Math.pow(y[0] - idealNegative[0], 2) +
      Math.pow(y[1] - idealNegative[1], 2) +
      Math.pow(y[2] - idealNegative[2], 2) +
      Math.pow(y[3] - idealNegative[3], 2)
    );

    // V_i = S_i- / (S_i+ + S_i-)
    const denom = dPlus + dMinus;
    const score = denom > 0 ? dMinus / denom : 0;

    let category: 'high' | 'medium' | 'low' = 'low';
    if (score >= 0.62) {
      category = 'high';
    } else if (score >= 0.45) {
      category = 'medium';
    }

    results.push({
      ...candidates[i],
      r,
      y,
      dPlus,
      dMinus,
      score,
      rank: 0, // Assigned after sorting
      category,
    });
  }

  // 5. Sort by Preference Score (V_i) descending
  results.sort((a, b) => b.score - a.score);

  // Assign 1-based ranks
  for (let i = 0; i < results.length; i++) {
    results[i].rank = i + 1;
  }

  const endTime = performance.now();

  return {
    candidates: results,
    divisors,
    weights,
    idealPositive,
    idealNegative,
    executionTimeMs: Math.round((endTime - startTime) * 100) / 100,
  };
}
