import { AhpResult, CriterionId } from './types';

// Saaty's Random Consistency Index (RI) table
export const RANDOM_INDEX_TABLE: Record<number, number> = {
  1: 0.0,
  2: 0.0,
  3: 0.58,
  4: 0.90,
  5: 1.12,
  6: 1.24,
  7: 1.32,
  8: 1.41,
  9: 1.45,
  10: 1.49,
};

export const CRITERIA_KEYS: CriterionId[] = ['c1', 'c2', 'c3', 'c4'];

export interface AhpPreset {
  id: string;
  label: string;
  description: string;
  // Upper triangle values: [c1-c2, c1-c3, c1-c4, c2-c3, c2-c4, c3-c4]
  pairs: Record<string, number>;
}

export const AHP_PRESETS: AhpPreset[] = [
  {
    id: 'balanced',
    label: 'Bobot Seimbang (Default)',
    description: 'Seluruh kriteria dianggap memiliki derajat kepentingan yang seimbang (sama penting).',
    pairs: {
      'c1-c2': 1,
      'c1-c3': 1,
      'c1-c4': 1,
      'c2-c3': 1,
      'c2-c4': 1,
      'c3-c4': 1,
    },
  },
  {
    id: 'gap_focus',
    label: 'Fokus Minim Kompetisi (Market Gap)',
    description: 'Mengutamakan pencarian area dengan jarak terjauh dari kompetitor kopi eksisting.',
    pairs: {
      'c1-c2': 3,
      'c1-c3': 3,
      'c1-c4': 2,
      'c2-c3': 1,
      'c2-c4': 0.5,
      'c3-c4': 0.5,
    },
  },
  {
    id: 'traffic_focus',
    label: 'Fokus Aksesibilitas & Keramaian',
    description: 'Mengutamakan kedekatan dengan simpul keramaian (mall/stasiun) dan akses jalan utama.',
    pairs: {
      'c1-c2': 0.5,
      'c1-c3': 0.333333,
      'c1-c4': 0.25,
      'c2-c3': 0.5,
      'c2-c4': 0.333333,
      'c3-c4': 0.5,
    },
  },
  {
    id: 'population_focus',
    label: 'Fokus Kepadatan Penduduk',
    description: 'Mengutamakan kecamatan dengan jumlah penduduk dan kepadatan konsumen tertinggi.',
    pairs: {
      'c1-c2': 0.333333,
      'c1-c3': 1,
      'c1-c4': 1,
      'c2-c3': 3,
      'c2-c4': 3,
      'c3-c4': 1,
    },
  },
];

/**
 * Builds a 4x4 pairwise comparison matrix from 6 upper-triangular pair values
 */
export function buildAhpMatrix(pairs: Record<string, number>): number[][] {
  const n = CRITERIA_KEYS.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(1));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else if (i < j) {
        const key = `${CRITERIA_KEYS[i]}-${CRITERIA_KEYS[j]}`;
        const val = pairs[key] ?? 1;
        matrix[i][j] = val;
        matrix[j][i] = 1 / val;
      }
    }
  }

  return matrix;
}

/**
 * Calculates AHP Weights, Lambda Max, Consistency Index (CI), and Consistency Ratio (CR)
 */
export function calculateAhp(matrix: number[][]): AhpResult {
  const n = matrix.length;
  if (n !== 4) {
    throw new Error(`Matrix must be 4x4, received ${n}x${n}`);
  }

  // 1. Column Sums
  const colSums = Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      colSums[j] += matrix[i][j];
    }
  }

  // 2. Normalized Matrix (column-normalized)
  const normalizedMatrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      normalizedMatrix[i][j] = matrix[i][j] / colSums[j];
    }
  }

  // 3. Priority Vector (Weights W) = average of each row in normalized matrix
  const weightsArray: [number, number, number, number] = [0, 0, 0, 0];
  for (let i = 0; i < n; i++) {
    let rowSum = 0;
    for (let j = 0; j < n; j++) {
      rowSum += normalizedMatrix[i][j];
    }
    weightsArray[i] = rowSum / n;
  }

  // 4. Calculate Lambda Max (Principal Eigenvalue)
  // v = A * W
  const v = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      v[i] += matrix[i][j] * weightsArray[j];
    }
  }

  // lambda_max = (1/n) * sum(v_i / w_i)
  let lambdaSum = 0;
  for (let i = 0; i < n; i++) {
    lambdaSum += v[i] / weightsArray[i];
  }
  const lambdaMax = lambdaSum / n;

  // 5. Consistency Index (CI)
  const ci = n > 1 ? (lambdaMax - n) / (n - 1) : 0;

  // 6. Consistency Ratio (CR)
  const ri = RANDOM_INDEX_TABLE[n] ?? 0.90;
  const rawCr = ri > 0 ? ci / ri : 0;
  const cr = Math.max(0, Math.round(rawCr * 10000) / 10000); // 4 decimal places

  const isConsistent = cr <= 0.10;

  const weights: Record<CriterionId, number> = {
    c1: weightsArray[0],
    c2: weightsArray[1],
    c3: weightsArray[2],
    c4: weightsArray[3],
  };

  return {
    weights,
    weightsArray,
    rawMatrix: matrix,
    normalizedMatrix,
    lambdaMax,
    ci,
    cr,
    isConsistent,
    criteriaOrder: CRITERIA_KEYS,
  };
}
