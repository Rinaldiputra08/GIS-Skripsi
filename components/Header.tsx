'use client';

import React from 'react';
import {
  Coffee,
  MapPin,
  Layers,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  RotateCcw,
  Sparkles,
  Compass,
} from 'lucide-react';
import { AhpResult } from '@/lib/types';

interface HeaderProps {
  ahpResult: AhpResult | null;
  totalCompetitors: number;
  totalCandidates: number;
  onOpenAudit: () => void;
  onOpenInfo: () => void;
  onReset: () => void;
  onOpenSurvey?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  ahpResult,
  totalCompetitors,
  totalCandidates,
  onOpenAudit,
  onOpenInfo,
  onReset,
  onOpenSurvey,
}) => {
  return (
    <header className="w-full bg-slate-950/90 border-b border-slate-800 backdrop-blur-md px-4 py-2.5 sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 shadow-lg">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950/50 ring-1 ring-white/20">
          <Coffee className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              KopiSpasial <span className="text-emerald-400 font-semibold">Bogor</span>
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
              AHP - TOPSIS
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            SIG Analisis Celah Pasar &amp; Penentuan Lokasi Strategis Kedai Kopi Kota Bogor
          </p>
        </div>
      </div>

      {/* Metrics / Status Indicators */}
      <div className="hidden lg:flex items-center gap-3">
        {/* Competitors Count */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
          <MapPin className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400">Kompetitor:</span>
          <span className="font-semibold text-amber-300">{totalCompetitors} Kedai</span>
        </div>

        {/* Sampling Points */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">Grid Analisis:</span>
          <span className="font-semibold text-cyan-300">{totalCandidates} Titik</span>
        </div>

        {/* Consistency indicator */}
        {ahpResult && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${
              ahpResult.isConsistent
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
            }`}
          >
            {ahpResult.isConsistent ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>
              CR: <strong className="font-bold">{(ahpResult.cr * 100).toFixed(1)}%</strong>{' '}
              {ahpResult.isConsistent ? '(Konsisten)' : '(Perlu Penyesuaian)'}
            </span>
          </div>
        )}
      </div>

      {/* Quick Action Buttons */}
      <div className="flex items-center gap-2">
        {onOpenSurvey && (
          <button
            onClick={onOpenSurvey}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 hover:text-emerald-200 text-xs font-semibold border border-emerald-500/50 shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
            title="Buka Mode Survei Lapangan Mandiri (GPS & Klik Peta)"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>Survei Lapangan</span>
          </button>
        )}

        <button
          onClick={onOpenAudit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/80 transition-all hover:border-emerald-500/40 hover:text-emerald-300 shadow-sm cursor-pointer"
          title="Tampilkan rincian matematis AHP & TOPSIS untuk audit skripsi"
        >
          <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Audit Metodologi</span>
        </button>

        <button
          onClick={onOpenInfo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/80 transition-all cursor-pointer"
          title="Informasi Skripsi & Petunjuk Penggunaan"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Panduan</span>
        </button>

        <button
          onClick={onReset}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs border border-slate-800 transition-all cursor-pointer"
          title="Reset ke Preset Bobot Default"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Reset</span>
        </button>
      </div>
    </header>
  );
};
