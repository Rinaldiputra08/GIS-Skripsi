import React from 'react';

export function PageHeader({ title, desc, children }: { title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[1.7rem]">{title}</h1>
        {desc && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-2">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

const TONES = {
  good: 'bg-good-bg text-good',
  mid: 'bg-mid-bg text-mid',
  bad: 'bg-bad-bg text-bad',
  info: 'bg-info-bg text-info',
  neutral: 'bg-oat-2 text-ink-2',
} as const;

export function Chip({ tone = 'neutral', children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold ${TONES[tone]}`}>{children}</span>;
}

export const SourceChip = ({ source }: { source?: string | null }) =>
  source === 'kaggle' ? <Chip tone="info">Kaggle</Chip>
  : source === 'osm' ? <Chip tone="good">OSM</Chip>
  : source === 'manual' ? <Chip tone="mid">Manual</Chip>
  : <Chip>{source ?? '–'}</Chip>;

export function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-3">{label}</p>
      <p className="tabular mt-1.5 text-3xl font-extrabold tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-3">{sub}</p>}
    </div>
  );
}
