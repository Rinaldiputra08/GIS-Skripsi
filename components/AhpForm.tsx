'use client';

import React, { useState } from 'react';
import { Check, TriangleAlert, ArrowRight, Table as TableIcon, Wand2 } from 'lucide-react';
import { AhpResult, CRITERIA_METADATA, CriterionId } from '@/lib/types';
import { AHP_PRESETS } from '@/lib/ahp';

/** Warna identitas tiap kriteria (hanya dipakai di form AHP agar mudah dipindai) */
const CRITERION_COLOR: Record<CriterionId, string> = {
  c1: '#7c5cff',
  c2: '#ff6b8b',
  c3: '#1fa2b8',
  c4: '#f2a93b',
};

const SHORT: Record<CriterionId, string> = {
  c1: 'Jarak kompetitor',
  c2: 'Kepadatan',
  c3: 'Akses jalan',
  c4: 'Keramaian',
};

interface PairDefinition {
  key: string;
  a: CriterionId;
  b: CriterionId;
  descA: string;
  descB: string;
}

const PAIR_DEFINITIONS: PairDefinition[] = [
  { key: 'c1-c2', a: 'c1', b: 'c2', descA: 'Menghindari persaingan langsung', descB: 'Mengejar pasar konsumen besar' },
  { key: 'c1-c3', a: 'c1', b: 'c3', descA: 'Menghindari persaingan langsung', descB: 'Kemudahan akses jalan protokol' },
  { key: 'c1-c4', a: 'c1', b: 'c4', descA: 'Menghindari persaingan langsung', descB: 'Dekat mall, pasar, & terminal' },
  { key: 'c2-c3', a: 'c2', b: 'c3', descA: 'Mengejar pasar konsumen besar', descB: 'Kemudahan akses jalan protokol' },
  { key: 'c2-c4', a: 'c2', b: 'c4', descA: 'Mengejar pasar konsumen besar', descB: 'Dekat mall, pasar, & terminal' },
  { key: 'c3-c4', a: 'c3', b: 'c4', descA: 'Kemudahan akses jalan protokol', descB: 'Dekat mall, pasar, & terminal' },
];

// Nilai skala Saaty yang dipakai (tidak berubah): A jauh lebih = 5, A lebih = 3, sama = 1, B lebih = 1/3, B jauh lebih = 1/5
const STEPS = [5, 3, 1, 1 / 3, 1 / 5] as const;

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

  // Nilai mentah -> langkah terdekat (logika asli, tidak diubah)
  const getSelectedStep = (val: number): number => {
    if (val >= 4) return 5;
    if (val >= 2) return 3;
    if (val <= 0.22) return 1 / 5;
    if (val <= 0.45) return 1 / 3;
    return 1;
  };

  const explain = (val: number, nameA: string, nameB: string): string => {
    if (Math.abs(val - 1) < 0.05) return 'Keduanya sama penting.';
    if (val >= 4) return `${nameA} jauh lebih penting daripada ${nameB}.`;
    if (val > 1) return `${nameA} lebih penting daripada ${nameB}.`;
    if (val <= 0.22) return `${nameB} jauh lebih penting daripada ${nameA}.`;
    return `${nameB} lebih penting daripada ${nameA}.`;
  };

  const ids = ['c1', 'c2', 'c3', 'c4'] as CriterionId[];

  return (
    <div className="animate-in flex flex-col gap-6">
      {/* Judul + mode */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-extrabold tracking-tight text-ink">Atur prioritas</h2>
          <div className="flex shrink-0 rounded-full bg-oat-2 p-0.5 text-xs font-bold" role="group" aria-label="Mode tampilan">
            <button
              type="button"
              onClick={() => setViewMode('guided')}
              aria-pressed={viewMode === 'guided'}
              className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 transition-all ${
                viewMode === 'guided' ? 'bg-paper text-ink shadow-soft' : 'text-ink-3 hover:text-ink'
              }`}
            >
              <Wand2 className="h-3.5 w-3.5" /> Mudah
            </button>
            <button
              type="button"
              onClick={() => setViewMode('formal_matrix')}
              aria-pressed={viewMode === 'formal_matrix'}
              title="Tampilkan matriks Saaty 4×4 formal"
              className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 transition-all ${
                viewMode === 'formal_matrix' ? 'bg-paper text-ink shadow-soft' : 'text-ink-3 hover:text-ink'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" /> Matriks
            </button>
          </div>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">
          Mana yang lebih penting untuk kedai kopimu? Sistem menghitung bobotnya dan memastikan jawabanmu konsisten.
        </p>
      </div>

      {/* Preset */}
      <section aria-labelledby="preset-title">
        <h3 id="preset-title" className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-3">
          Mulai cepat dengan strategi
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {AHP_PRESETS.map((preset) => {
            const selected = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onApplyPreset(preset.id)}
                aria-pressed={selected}
                className={`relative cursor-pointer rounded-2xl border p-3 text-left transition-all ${
                  selected
                    ? 'border-espresso bg-espresso text-white shadow-float'
                    : 'border-line bg-paper text-ink hover:border-line-2 hover:shadow-soft'
                }`}
              >
                {selected && (
                  <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-lime text-ink">
                    <Check className="h-3 w-3" strokeWidth={3.5} />
                  </span>
                )}
                <span className="block pr-5 text-[13px] font-extrabold leading-snug">{preset.label}</span>
                <span className={`mt-1 line-clamp-2 block text-xs leading-snug ${selected ? 'text-white/70' : 'text-ink-3'}`}>
                  {preset.description}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Perbandingan */}
      {viewMode === 'guided' && (
        <section aria-labelledby="pair-title" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h3 id="pair-title" className="text-xs font-bold uppercase tracking-wider text-ink-3">
              Atau sesuaikan sendiri
            </h3>
            <span className="text-xs font-medium text-ink-3">6 perbandingan</span>
          </div>

          {PAIR_DEFINITIONS.map((pair, idx) => {
            const val = pairs[pair.key] ?? 1;
            const step = getSelectedStep(val);
            const colA = CRITERION_COLOR[pair.a];
            const colB = CRITERION_COLOR[pair.b];
            const nameA = SHORT[pair.a];
            const nameB = SHORT[pair.b];

            const labels = ['Jauh lebih', 'Lebih', 'Sama', 'Lebih', 'Jauh lebih'];

            return (
              <fieldset key={pair.key} className="card flex flex-col gap-3 p-4">
                <legend className="sr-only">
                  Perbandingan {idx + 1}: {nameA} dengan {nameB}
                </legend>

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colA }} />
                      <span className="truncate">{nameA}</span>
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-ink-3">{pair.descA}</span>
                  </div>
                  <span className="mt-0.5 shrink-0 text-[11px] font-extrabold text-ink-3">VS</span>
                  <div className="min-w-0 flex-1 text-right">
                    <span className="flex items-center justify-end gap-1.5 text-sm font-extrabold text-ink">
                      <span className="truncate">{nameB}</span>
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colB }} />
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-ink-3">{pair.descB}</span>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {STEPS.map((s, i) => {
                    const selected = Math.abs(step - s) < 0.05;
                    const side = i < 2 ? 'a' : i > 2 ? 'b' : 'mid';
                    const fill = side === 'a' ? colA : side === 'b' ? colB : '#2a1f18';
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onPairChange(pair.key, s)}
                        aria-pressed={selected}
                        aria-label={`${labels[i]} ${side === 'a' ? nameA : side === 'b' ? nameB : ''}`.trim()}
                        className={`flex min-h-[44px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-0.5 py-1.5 text-center transition-all ${
                          selected ? 'text-white shadow-soft' : 'border-line bg-paper text-ink-2 hover:border-line-2'
                        }`}
                        style={selected ? { background: fill, borderColor: fill } : undefined}
                      >
                        <span className="text-[11px] font-extrabold leading-none">{labels[i]}</span>
                        <span className={`text-[10px] font-semibold leading-none ${selected ? 'opacity-80' : 'text-ink-3'}`}>
                          {side === 'a' ? '◀' : side === 'b' ? '▶' : '●'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <p className="rounded-xl bg-oat px-3 py-2 text-[13px] font-medium leading-snug text-ink-2" aria-live="polite">
                  {explain(val, nameA, nameB)}
                </p>
              </fieldset>
            );
          })}
        </section>
      )}

      {viewMode === 'formal_matrix' && (
        <section className="card p-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-extrabold text-ink">Matriks perbandingan Saaty 4×4</h3>
            <span className="text-xs text-ink-3">Skala 1–9</span>
          </div>
          <div className="mt-3 overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-xs">
              <thead className="bg-oat text-ink-3">
                <tr>
                  <th className="p-2.5 font-semibold">Kriteria</th>
                  {ids.map((c) => (
                    <th key={c} className="p-2.5 font-mono font-bold" style={{ color: CRITERION_COLOR[c] }}>
                      {c.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ahpResult.rawMatrix.map((row, i) => (
                  <tr key={i}>
                    <td className="p-2.5 font-bold text-ink">
                      {ids[i].toUpperCase()} · {SHORT[ids[i]]}
                    </td>
                    {row.map((v, j) => (
                      <td key={j} className="tabular p-2.5 font-mono font-semibold text-ink-2">
                        {v >= 1 ? v.toFixed(2) : `1/${(1 / v).toFixed(1)}`}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs italic text-ink-3">
            Representasi formal metode Analytic Hierarchy Process (Thomas L. Saaty).
          </p>
        </section>
      )}

      {/* Bobot hasil */}
      <section className="card p-4" aria-labelledby="w-title">
        <div className="flex items-baseline justify-between">
          <h3 id="w-title" className="text-sm font-extrabold text-ink">
            Bobot hasil
          </h3>
          <span className="text-xs font-medium text-ink-3">total 100%</span>
        </div>

        <div className="mt-3 flex h-4 w-full overflow-hidden rounded-full bg-oat-2" role="img" aria-label="Komposisi bobot kriteria">
          {ids.map((c) => (
            <div
              key={c}
              className="h-full transition-all duration-500"
              style={{ width: `${(ahpResult.weights[c] || 0) * 100}%`, background: CRITERION_COLOR[c] }}
            />
          ))}
        </div>

        <ul className="mt-4 flex flex-col gap-2.5">
          {ids.map((c) => {
            const info = CRITERIA_METADATA[c];
            const pct = ((ahpResult.weights[c] || 0) * 100).toFixed(1);
            return (
              <li key={c} className="flex items-center gap-2.5 text-sm">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: CRITERION_COLOR[c] }} />
                <span className="min-w-0 flex-1">
                  <b className="font-bold text-ink">{info.code}</b>{' '}
                  <span className="text-ink-2">{info.shortName}</span>
                  <span className="block text-xs text-ink-3">
                    {info.type === 'benefit' ? 'Makin besar makin baik' : 'Makin dekat makin baik'}
                  </span>
                </span>
                <span className="tabular font-mono text-[15px] font-bold text-ink">{pct}%</span>
              </li>
            );
          })}
        </ul>

        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
          <Stat label="λ maks" value={ahpResult.lambdaMax.toFixed(3)} />
          <Stat label="CI" value={ahpResult.ci.toFixed(4)} />
          <Stat label="CR" value={`${(ahpResult.cr * 100).toFixed(1)}%`} />
        </dl>
      </section>

      {!ahpResult.isConsistent && (
        <div role="alert" className="flex gap-3 rounded-2xl bg-bad-bg p-4 text-sm leading-snug text-bad">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            <b>Jawabanmu belum konsisten.</b> Ada pilihan yang saling bertentangan (misalnya A &gt; B, B &gt; C, tapi C &gt; A). Pilih salah
            satu <b>strategi</b> di atas, atau ubah beberapa perbandingan.
          </p>
        </div>
      )}

      {/* Aksi utama: selalu terlihat di bawah panel */}
      <div className="sticky -bottom-5 -mx-5 -mb-5 mt-1 border-t border-line bg-paper/95 px-5 py-4 backdrop-blur">
        <div className="mb-2.5 flex items-center justify-between text-xs font-semibold">
          <span className={`chip ${ahpResult.isConsistent ? 'bg-good-bg text-good' : 'bg-bad-bg text-bad'}`}>
            {ahpResult.isConsistent ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <TriangleAlert className="h-3.5 w-3.5" />}
            {ahpResult.isConsistent ? 'Konsisten' : 'Belum konsisten'} · CR {(ahpResult.cr * 100).toFixed(1)}%
          </span>
          <span className="text-ink-3">batas 10%</span>
        </div>
        <button
          type="button"
          onClick={onCalculate}
          disabled={isCalculating || !ahpResult.isConsistent}
          className="btn btn-primary w-full !min-h-[52px] !text-[15px]"
        >
          {isCalculating ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Menghitung…
            </>
          ) : (
            <>
              Hitung rekomendasi <ArrowRight className="h-[18px] w-[18px]" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <dt className="text-[11px] font-semibold text-ink-3">{label}</dt>
    <dd className="tabular font-mono text-sm font-bold text-ink">{value}</dd>
  </div>
);
