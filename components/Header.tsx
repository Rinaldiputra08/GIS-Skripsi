'use client';

import React from 'react';
import { Coffee, Store, Grid3x3, BookOpen, RotateCcw, CircleHelp, Check, TriangleAlert } from 'lucide-react';
import { AhpResult } from '@/lib/types';

interface HeaderProps {
  ahpResult: AhpResult | null;
  totalCompetitors: number;
  totalCandidates: number;
  dataSource?: string;
  onOpenAudit: () => void;
  onOpenInfo: () => void;
  onReset: () => void;
  onOpenSurvey?: () => void;
}

/**
 * Header melayang di atas peta (bukan bilah penuh) agar peta tetap menjadi fokus.
 * - kiri : identitas aplikasi + indikator sumber data
 * - kanan: statistik singkat (desktop) + aksi (audit metodologi, panduan, reset)
 */
export const Header: React.FC<HeaderProps> = ({
  ahpResult,
  totalCompetitors,
  totalCandidates,
  dataSource,
  onOpenAudit,
  onOpenInfo,
  onReset,
}) => {
  const fromDb = dataSource === 'supabase_live';

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-[600] flex items-start justify-between gap-2 p-3 sm:p-4">
      {/* Brand */}
      <div className="float-panel pointer-events-auto flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-espresso text-lime">
          <Coffee className="h-5 w-5" strokeWidth={2.4} />
        </div>
        <div className="leading-tight">
          <h1 className="text-[15px] font-extrabold tracking-tight text-ink">
            KopiSpasial <span className="text-ink-3 font-bold">Bogor</span>
          </h1>
          <p
            className="flex items-center gap-1.5 text-[11px] font-medium text-ink-3"
            title={
              fromDb
                ? 'Layer dan grid dibaca dari database Supabase (PostGIS)'
                : 'Database belum siap / tidak terjangkau: memakai data cadangan lokal'
            }
          >
            <span className={`h-1.5 w-1.5 rounded-full ${fromDb ? 'bg-good' : 'bg-mid'}`} />
            <span className="hidden sm:inline">{fromDb ? 'Data langsung dari Supabase' : 'Data cadangan lokal'}</span>
            <span className="sm:hidden">{fromDb ? 'Supabase' : 'Data lokal'}</span>
          </p>
        </div>
      </div>

      {/* Stats + actions */}
      <div className="pointer-events-auto flex items-center gap-2">
        <div className="float-panel hidden items-center gap-1 rounded-full px-2 py-1.5 text-xs font-semibold text-ink-2 md:flex">
          <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1">
            <Store className="h-3.5 w-3.5 text-ink-3" />
            <b className="tabular text-ink">{totalCompetitors}</b> kedai
          </span>
          <span className="h-4 w-px bg-line" />
          <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1">
            <Grid3x3 className="h-3.5 w-3.5 text-ink-3" />
            <b className="tabular text-ink">{totalCandidates.toLocaleString('id-ID')}</b> titik
          </span>
          {ahpResult && (
            <>
              <span className="h-4 w-px bg-line" />
              <span
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
                  ahpResult.isConsistent ? 'bg-good-bg text-good' : 'bg-bad-bg text-bad'
                }`}
                title="Consistency Ratio AHP (batas 10%)"
              >
                {ahpResult.isConsistent ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <TriangleAlert className="h-3.5 w-3.5" />}
                CR <b className="tabular">{(ahpResult.cr * 100).toFixed(1)}%</b>
              </span>
            </>
          )}
        </div>

        <div className="float-panel flex items-center gap-0.5 rounded-full p-1">
          <IconButton label="Audit metodologi" onClick={onOpenAudit} icon={<BookOpen className="h-[18px] w-[18px]" />} />
          <IconButton label="Panduan" onClick={onOpenInfo} icon={<CircleHelp className="h-[18px] w-[18px]" />} />
          <IconButton label="Reset" onClick={onReset} icon={<RotateCcw className="h-[18px] w-[18px]" />} />
        </div>
      </div>
    </header>
  );
};

const IconButton: React.FC<{ label: string; onClick: () => void; icon: React.ReactNode }> = ({ label, onClick, icon }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-oat-2 hover:text-ink sm:w-auto sm:gap-2 sm:px-3.5"
  >
    {icon}
    <span className="hidden text-[13px] font-semibold lg:inline">{label}</span>
  </button>
);
