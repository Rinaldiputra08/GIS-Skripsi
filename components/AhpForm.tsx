'use client';

import React, { useState } from 'react';
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Info,
  Layers,
  ArrowRight,
  Scale,
  Table as TableIcon,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { AhpResult, CRITERIA_METADATA, CriterionId } from '@/lib/types';
import { AHP_PRESETS } from '@/lib/ahp';

interface PairDefinition {
  key: string;
  criterionA: CriterionId;
  criterionB: CriterionId;
  nameA: string;
  nameB: string;
  descA: string;
  descB: string;
}

const PAIR_DEFINITIONS: PairDefinition[] = [
  {
    key: 'c1-c2',
    criterionA: 'c1',
    criterionB: 'c2',
    nameA: 'Jarak Kompetitor (C1)',
    nameB: 'Populasi Penduduk (C2)',
    descA: 'Menghindari persaingan langsung',
    descB: 'Mengejar pasar konsumen besar',
  },
  {
    key: 'c1-c3',
    criterionA: 'c1',
    criterionB: 'c3',
    nameA: 'Jarak Kompetitor (C1)',
    nameB: 'Akses Jalan Utama (C3)',
    descA: 'Menghindari persaingan langsung',
    descB: 'Kemudahan akses jalan protokol',
  },
  {
    key: 'c1-c4',
    criterionA: 'c1',
    criterionB: 'c4',
    nameA: 'Jarak Kompetitor (C1)',
    nameB: 'Simpul Keramaian (C4)',
    descA: 'Menghindari persaingan langsung',
    descB: 'Dekat mall, stasiun, & kampus',
  },
  {
    key: 'c2-c3',
    criterionA: 'c2',
    criterionB: 'c3',
    nameA: 'Populasi Penduduk (C2)',
    nameB: 'Akses Jalan Utama (C3)',
    descA: 'Mengejar pasar konsumen besar',
    descB: 'Kemudahan akses jalan protokol',
  },
  {
    key: 'c2-c4',
    criterionA: 'c2',
    criterionB: 'c4',
    nameA: 'Populasi Penduduk (C2)',
    nameB: 'Simpul Keramaian (C4)',
    descA: 'Mengejar pasar konsumen besar',
    descB: 'Dekat mall, stasiun, & kampus',
  },
  {
    key: 'c3-c4',
    criterionA: 'c3',
    criterionB: 'c4',
    nameA: 'Akses Jalan Utama (C3)',
    nameB: 'Simpul Keramaian (C4)',
    descA: 'Kemudahan akses jalan protokol',
    descB: 'Dekat mall, stasiun, & kampus',
  },
];

interface AhpFormProps {
  pairs: Record<string, number>;
  onPairChange: (pairKey: string, value: number) => void;
  onApplyPreset: (presetId: string) => void;
  activePreset: string | null;
  ahpResult: AhpResult;
  onCalculate: () => void;
  isCalculating: boolean;
}

export const AhpForm: React.FC<AhpFormProps> = ({
  pairs,
  onPairChange,
  onApplyPreset,
  activePreset,
  ahpResult,
  onCalculate,
  isCalculating,
}) => {
  const [viewMode, setViewMode] = useState<'guided' | 'formal_matrix'>('guided');

  // Convert raw numeric value to friendly semantic step
  // Options: 5 (Kiri Sangat Penting), 3 (Kiri Lebih Penting), 1 (Sama Penting), 1/3 (Kanan Lebih Penting), 1/5 (Kanan Sangat Penting)
  const getSelectedStep = (val: number): number => {
    if (val >= 4) return 5;
    if (val >= 2) return 3;
    if (val <= 0.22) return 1 / 5;
    if (val <= 0.45) return 1 / 3;
    return 1;
  };

  const getExplanationSentence = (val: number, nameA: string, nameB: string): string => {
    if (Math.abs(val - 1) < 0.05) {
      return `Kedua kriteria dianggap sama penting (seimbang 50:50).`;
    }
    if (val >= 4) {
      return `Anda menganggap ${nameA} mutlak/sangat diprioritaskan dibanding ${nameB}.`;
    }
    if (val > 1) {
      return `Anda lebih mengutamakan ${nameA} dibanding ${nameB}.`;
    }
    if (val <= 0.22) {
      return `Anda menganggap ${nameB} mutlak/sangat diprioritaskan dibanding ${nameA}.`;
    }
    return `Anda lebih mengutamakan ${nameB} dibanding ${nameA}.`;
  };

  return (
    <div className="flex flex-col gap-5 text-slate-100">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col gap-2.5 border-b border-slate-800 pb-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Scale className="w-4 h-4" /> Pembobotan Preferensi AHP
          </span>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode('guided')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer font-medium flex items-center gap-1 ${
                viewMode === 'guided'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Panduan Visual</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('formal_matrix')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer font-medium flex items-center gap-1 ${
                viewMode === 'formal_matrix'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Tampilkan Matriks 4x4 Saaty Formal untuk Sidang Skripsi"
            >
              <TableIcon className="w-3 h-3" />
              <span>Matriks Formal</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Tentukan mana kriteria yang lebih Anda prioritaskan dalam menentukan lokasi kedai kopi baru. Sistem otomatis menghitung bobot dan memvalidasi konsistensi (<em className="text-emerald-300 not-italic">CR ≤ 10%</em>).
        </p>
      </div>

      {/* Preset Strategies */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" /> Pilih Strategi Cepat (Preset):
        </label>
        <div className="grid grid-cols-2 gap-2">
          {AHP_PRESETS.map((preset) => {
            const isSelected = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onApplyPreset(preset.id)}
                type="button"
                className={`px-3 py-2 text-left rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/40'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800/90 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-[11px] truncate">{preset.label}</div>
                <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                  {preset.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* VIEW 1: GUIDED VISUAL BALANCE (USER FRIENDLY) */}
      {viewMode === 'guided' && (
        <div className="flex flex-col gap-3.5">
          <span className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Perbandingan Antarkriteria:</span>
            <span className="text-[10px] text-slate-500 font-normal">6 Pilihan Keseimbangan</span>
          </span>

          {PAIR_DEFINITIONS.map((pair, idx) => {
            const currentVal = pairs[pair.key] ?? 1;
            const currentStep = getSelectedStep(currentVal);

            // Split percentage for visual tug-of-war bar
            let leftPct = 50;
            let rightPct = 50;
            if (currentStep === 5) {
              leftPct = 80;
              rightPct = 20;
            } else if (currentStep === 3) {
              leftPct = 65;
              rightPct = 35;
            } else if (Math.abs(currentStep - 1 / 3) < 0.05) {
              leftPct = 35;
              rightPct = 65;
            } else if (Math.abs(currentStep - 1 / 5) < 0.05) {
              leftPct = 20;
              rightPct = 80;
            }

            return (
              <div
                key={pair.key}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2.5 shadow-sm"
              >
                {/* Comparison Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <span className="text-xs font-bold text-emerald-300 block leading-tight">
                      {pair.nameA}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{pair.descA}</span>
                  </div>

                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    VS
                  </span>

                  <div className="flex-1 text-right">
                    <span className="text-xs font-bold text-cyan-300 block leading-tight">
                      {pair.nameB}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{pair.descB}</span>
                  </div>
                </div>

                {/* Visual Tug-of-War Split Bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden flex">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                    style={{ width: `${leftPct}%` }}
                  />
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
                    style={{ width: `${rightPct}%` }}
                  />
                </div>

                {/* 5 User-Friendly Semantic Buttons */}
                <div className="grid grid-cols-5 gap-1 pt-1">
                  {/* Step 1: Kiri Sangat Penting */}
                  <button
                    type="button"
                    onClick={() => onPairChange(pair.key, 5)}
                    className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer ${
                      currentStep === 5
                        ? 'bg-emerald-600 text-white font-bold ring-1 ring-emerald-400 shadow'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="block text-[10px] leading-tight font-bold">Kiri Mutlak</span>
                    <span className="text-[9px] opacity-80 block">(5x)</span>
                  </button>

                  {/* Step 2: Kiri Lebih Penting */}
                  <button
                    type="button"
                    onClick={() => onPairChange(pair.key, 3)}
                    className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer ${
                      currentStep === 3
                        ? 'bg-emerald-600 text-white font-bold ring-1 ring-emerald-400 shadow'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="block text-[10px] leading-tight font-bold">Kiri Lebih</span>
                    <span className="text-[9px] opacity-80 block">(3x)</span>
                  </button>

                  {/* Step 3: Sama Penting (1:1) */}
                  <button
                    type="button"
                    onClick={() => onPairChange(pair.key, 1)}
                    className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer ${
                      currentStep === 1
                        ? 'bg-teal-600 text-white font-bold ring-1 ring-teal-400 shadow'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="block text-[10px] leading-tight font-bold">Sama</span>
                    <span className="text-[9px] opacity-80 block">(1:1)</span>
                  </button>

                  {/* Step 4: Kanan Lebih Penting */}
                  <button
                    type="button"
                    onClick={() => onPairChange(pair.key, 1 / 3)}
                    className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer ${
                      Math.abs(currentStep - 1 / 3) < 0.05
                        ? 'bg-cyan-600 text-white font-bold ring-1 ring-cyan-400 shadow'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="block text-[10px] leading-tight font-bold">Kanan Lebih</span>
                    <span className="text-[9px] opacity-80 block">(3x)</span>
                  </button>

                  {/* Step 5: Kanan Sangat Penting */}
                  <button
                    type="button"
                    onClick={() => onPairChange(pair.key, 1 / 5)}
                    className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer ${
                      Math.abs(currentStep - 1 / 5) < 0.05
                        ? 'bg-cyan-600 text-white font-bold ring-1 ring-cyan-400 shadow'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="block text-[10px] leading-tight font-bold">Kanan Mutlak</span>
                    <span className="text-[9px] opacity-80 block">(5x)</span>
                  </button>
                </div>

                {/* Natural Sentence Explanation */}
                <div className="text-[11px] text-slate-300 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800/60 flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">💡</span>
                  <span>{getExplanationSentence(currentVal, pair.nameA, pair.nameB)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: FORMAL SAATY 4x4 MATRIX TABLE (FOR THESIS PRESENTATION) */}
      {viewMode === 'formal_matrix' && (
        <div className="flex flex-col gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-200 flex items-center gap-1.5">
              <TableIcon className="w-3.5 h-3.5 text-emerald-400" /> Matriks Perbandingan Saaty (4x4):
            </span>
            <span className="text-[10px] text-slate-400">Skala Saaty 1-9</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="p-2">Kriteria</th>
                  <th className="p-2">C1</th>
                  <th className="p-2">C2</th>
                  <th className="p-2">C3</th>
                  <th className="p-2">C4</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {ahpResult.rawMatrix.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-900/50">
                    <td className="p-2 font-sans font-bold text-emerald-400">
                      {['C1 (Jarak Kopi)', 'C2 (Populasi)', 'C3 (Akses Jalan)', 'C4 (Keramaian)'][i]}
                    </td>
                    {row.map((val, j) => (
                      <td key={j} className="p-2 font-bold">
                        {val >= 1 ? val.toFixed(2) : `1/${(1 / val).toFixed(1)}`}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-400 italic">
            *Tabel ini adalah representasi matematis formal metode Analytic Hierarchy Process (AHP) dari Thomas L. Saaty.
          </p>
        </div>
      )}

      {/* Calculated Priority Weights Visualizer */}
      <div className="flex flex-col gap-2.5 bg-slate-900/70 p-3.5 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-200 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" /> Hasil Bobot Prioritas Kriteria (W):
          </span>
          <span className="text-emerald-400 font-mono text-[11px] font-bold">Total: 100%</span>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          {(['c1', 'c2', 'c3', 'c4'] as CriterionId[]).map((cid, idx) => {
            const info = CRITERIA_METADATA[cid];
            const weight = ahpResult.weights[cid] || 0.25;
            const pct = (weight * 100).toFixed(1);

            const colors = [
              'from-emerald-500 to-teal-400',
              'from-blue-500 to-cyan-400',
              'from-amber-500 to-yellow-400',
              'from-purple-500 to-pink-400',
            ];

            return (
              <div key={cid} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-medium">
                    <strong className="text-white">{info.code}</strong> - {info.shortName}
                    <span className="text-[10px] text-slate-500 ml-1.5">
                      ({info.type === 'benefit' ? 'Makin Besar Makin Baik' : 'Makin Dekat Makin Baik'})
                    </span>
                  </span>
                  <span className="font-mono font-bold text-slate-200">{pct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${colors[idx]} transition-all duration-300`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Consistency Ratio (CR) Card */}
      <div
        className={`p-3.5 rounded-xl border flex flex-col gap-2 transition-all ${
          ahpResult.isConsistent
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
            : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {ahpResult.isConsistent ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <div>
              <div className="text-xs font-bold">
                {ahpResult.isConsistent
                  ? 'Matriks AHP Konsisten & Valid'
                  : 'Peringatan: Matriks Tidak Konsisten'}
              </div>
              <div className="text-[11px] opacity-80">
                Rasio Konsistensi (CR) = {(ahpResult.cr * 100).toFixed(1)}% (Batas Maks: 10%)
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400 block">λ_max: {ahpResult.lambdaMax.toFixed(3)}</span>
            <span className="text-[10px] font-mono text-slate-400 block">CI: {ahpResult.ci.toFixed(4)}</span>
          </div>
        </div>

        {!ahpResult.isConsistent && (
          <p className="text-[11px] text-rose-300/90 leading-tight bg-rose-900/30 p-2 rounded border border-rose-800/40">
            Perbandingan preferensi antar kriteria mengalami pertentangan logika. Silakan gunakan salah satu <strong>Preset Strategi</strong> di atas untuk mendapatkan bobot konsisten.
          </p>
        )}
      </div>

      {/* Primary Action Button */}
      <button
        type="button"
        onClick={onCalculate}
        disabled={isCalculating || !ahpResult.isConsistent}
        className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
          !ahpResult.isConsistent
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            : isCalculating
            ? 'bg-emerald-700 text-white cursor-wait'
            : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/40 hover:shadow-emerald-900/70 hover:scale-[1.01] active:scale-[0.99]'
        }`}
      >
        {isCalculating ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Memproses TOPSIS Keruangan...</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Hitung Rekomendasi Spasial (TOPSIS)</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
};
