'use client';

import React from 'react';
import {
  Coffee,
  Store,
  Pill,
  MapPin,
  Layers,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  RotateCcw,
  Sparkles,
  Compass,
} from 'lucide-react';
import { AhpResult, BusinessType, BUSINESS_TYPES } from '@/lib/types';

interface HeaderProps {
  ahpResult: AhpResult | null;
  totalCompetitors: number;
  totalCandidates: number;
  selectedBusinessType: BusinessType;
  onChangeBusinessType: (type: BusinessType) => void;
  onOpenAudit: () => void;
  onOpenInfo: () => void;
  onReset: () => void;
  onOpenSurvey?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  ahpResult,
  totalCompetitors,
  totalCandidates,
  selectedBusinessType = 'coffee_shop',
  onChangeBusinessType,
  onOpenAudit,
  onOpenInfo,
  onReset,
  onOpenSurvey,
}) => {
  const currentBusiness = BUSINESS_TYPES[selectedBusinessType] || BUSINESS_TYPES.coffee_shop;

  const getBrandIcon = () => {
    if (selectedBusinessType === 'minimarket') return <Store className="w-5 h-5 text-white" />;
    if (selectedBusinessType === 'apotek') return <Pill className="w-5 h-5 text-white" />;
    return <Coffee className="w-5 h-5 text-white" />;
  };

  const getBrandTitle = () => {
    if (selectedBusinessType === 'minimarket') return { main: 'RetailSpasial', sub: 'Minimarket' };
    if (selectedBusinessType === 'apotek') return { main: 'FarmaSpasial', sub: 'Apotek' };
    return { main: 'KopiSpasial', sub: 'Kedai Kopi' };
  };

  const brand = getBrandTitle();

  return (
    <header className="w-full bg-slate-950/90 border-b border-slate-800 backdrop-blur-md px-4 py-2.5 sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 shadow-lg">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg ring-1 ring-white/20 transition-all ${
            selectedBusinessType === 'minimarket'
              ? 'bg-gradient-to-tr from-sky-600 to-blue-500 shadow-sky-950/50'
              : selectedBusinessType === 'apotek'
              ? 'bg-gradient-to-tr from-rose-600 to-pink-500 shadow-rose-950/50'
              : 'bg-gradient-to-tr from-amber-600 via-emerald-600 to-teal-500 shadow-emerald-950/50'
          }`}
        >
          {getBrandIcon()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              {brand.main} <span className="text-emerald-400 font-semibold">Bogor</span>
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
              AHP - TOPSIS
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            SIG Analisis Celah Pasar &amp; Penentuan Lokasi Strategis {brand.sub} Kota Bogor
          </p>
        </div>
      </div>

      {/* Lini Bisnis Switcher (Multi-Business Lines: Kopi, Minimarket, Apotek) */}
      <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 shadow-inner">
        <span className="text-[10px] text-slate-400 font-semibold uppercase px-2 hidden xl:inline">
          Lini Bisnis:
        </span>
        {[
          {
            id: 'coffee_shop',
            label: 'Kedai Kopi',
            icon: Coffee,
            color: 'text-amber-400',
            activeBg: 'bg-amber-500/20 border-amber-500/40 text-amber-200',
          },
          {
            id: 'minimarket',
            label: 'Minimarket',
            icon: Store,
            color: 'text-sky-400',
            activeBg: 'bg-sky-500/20 border-sky-500/40 text-sky-200',
          },
          {
            id: 'apotek',
            label: 'Apotek',
            icon: Pill,
            color: 'text-rose-400',
            activeBg: 'bg-rose-500/20 border-rose-500/40 text-rose-200',
          },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = selectedBusinessType === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeBusinessType(item.id as BusinessType)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                isActive
                  ? `${item.activeBg} shadow-sm`
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? item.color : 'text-slate-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Metrics / Status Indicators */}
      <div className="hidden lg:flex items-center gap-3">
        {/* Competitors Count */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
          <MapPin className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400">Kompetitor:</span>
          <span className="font-semibold text-amber-300">
            {totalCompetitors}{' '}
            {selectedBusinessType === 'minimarket'
              ? 'Gerai'
              : selectedBusinessType === 'apotek'
              ? 'Apotek'
              : 'Kedai'}
          </span>
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
