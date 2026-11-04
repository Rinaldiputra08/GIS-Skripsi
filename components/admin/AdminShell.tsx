'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Coffee, LayoutDashboard, Store, MapPinned, ShieldAlert, Users, SlidersHorizontal, History, MessageSquare,
  LogOut, Map as MapIcon, AlertTriangle, RefreshCw, Menu, X,
} from 'lucide-react';
import { adminFetch } from './api';
import { useLoad } from '@/lib/use-load';

const NAV = [
  { href: '/admin', label: 'Dasbor', icon: LayoutDashboard },
  { href: '/admin/kompetitor', label: 'Kompetitor', icon: Store },
  { href: '/admin/keramaian', label: 'Pusat keramaian', icon: MapPinned },
  { href: '/admin/zona', label: 'Zona terlarang', icon: ShieldAlert },
  { href: '/admin/penduduk', label: 'Data penduduk', icon: Users },
  { href: '/admin/parameter', label: 'Parameter sistem', icon: SlidersHorizontal },
  { href: '/admin/riwayat', label: 'Riwayat', icon: History },
  { href: '/admin/masukan', label: 'Masukan pengguna', icon: MessageSquare },
];

interface Banner { cmsReady: boolean; pending: number }

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const stats = useLoad(() => adminFetch<{ cmsReady: boolean; pending: number }>('/api/admin/stats'), [pathname]);
  const banner: Banner | null = stats.data ? { cmsReady: stats.data.cmsReady, pending: stats.data.pending } : null;
  const { reload } = stats;

  useEffect(() => {
    window.addEventListener('admin:changed', reload);
    return () => window.removeEventListener('admin:changed', reload);
  }, [reload]);

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  };

  const active = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Menu admin">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href} href={href} onClick={() => setOpen(false)}
          aria-current={active(href) ? 'page' : undefined}
          className={`flex min-h-11 items-center gap-3 rounded-full px-4 text-sm font-bold transition-colors ${
            active(href) ? 'bg-lime text-espresso' : 'text-oat/80 hover:bg-white/10'
          }`}
        >
          <Icon className="h-[18px] w-[18px]" />
          {label}
          {href === '/admin' && banner && banner.pending > 0 && (
            <span className="ml-auto rounded-full bg-mid-bg px-2 py-0.5 text-[11px] font-extrabold text-mid">{banner.pending}</span>
          )}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 bg-espresso p-5 lg:flex">
        <Brand />
        {nav}
        <div className="mt-auto space-y-2">
          <Link href="/" className="flex min-h-11 items-center gap-3 rounded-full px-4 text-sm font-bold text-oat/80 hover:bg-white/10">
            <MapIcon className="h-[18px] w-[18px]" /> Lihat peta
          </Link>
          <button onClick={logout} className="flex min-h-11 w-full items-center gap-3 rounded-full px-4 text-sm font-bold text-oat/80 hover:bg-white/10">
            <LogOut className="h-[18px] w-[18px]" /> Keluar
          </button>
          <p className="truncate px-4 text-xs text-oat/50" title={email}>{email}</p>
        </div>
      </aside>

      {/* Bilah atas mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-espresso px-4 py-3 lg:hidden">
        <Brand compact />
        <button onClick={() => setOpen((v) => !v)} aria-label={open ? 'Tutup menu' : 'Buka menu'} aria-expanded={open}
          className="flex h-11 w-11 items-center justify-center rounded-full text-oat hover:bg-white/10">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      {open && (
        <div className="fixed inset-x-0 top-[68px] z-30 max-h-[calc(100dvh-68px)] overflow-y-auto bg-espresso p-4 pb-6 lg:hidden">
          {nav}
          <div className="mt-4 space-y-1 border-t border-white/10 pt-4">
            <Link href="/" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-3 rounded-full px-4 text-sm font-bold text-oat/80"><MapIcon className="h-[18px] w-[18px]" /> Lihat peta</Link>
            <button onClick={logout} className="flex min-h-11 w-full items-center gap-3 rounded-full px-4 text-sm font-bold text-oat/80"><LogOut className="h-[18px] w-[18px]" /> Keluar</button>
          </div>
        </div>
      )}

      <main className="min-w-0 px-4 py-6 sm:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl space-y-5">
          {banner && !banner.cmsReady && (
            <div role="alert" className="flex items-start gap-3 rounded-2xl bg-bad-bg p-4 text-sm text-bad">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p><b>Database belum disiapkan untuk CMS.</b> Jalankan <code className="rounded bg-white/60 px-1.5 py-0.5 font-mono text-xs">supabase/cms.sql</code> di Supabase SQL Editor, lalu muat ulang halaman ini.</p>
            </div>
          )}
          {banner && banner.cmsReady && banner.pending > 0 && pathname !== '/admin' && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-mid-bg p-4 text-sm text-mid">
              <RefreshCw className="h-5 w-5 shrink-0" />
              <p className="min-w-0 flex-1"><b>{banner.pending} perubahan data belum diterapkan.</b> Peringkat lokasi baru berubah setelah grid dibangun ulang.</p>
              <Link href="/admin" className="btn btn-primary !min-h-10 !px-4">Terapkan</Link>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link href="/admin" className="flex items-center gap-2.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lime text-espresso">
        <Coffee className="h-5 w-5" strokeWidth={2.4} />
      </div>
      <div className="leading-tight">
        <p className="text-[15px] font-extrabold tracking-tight text-oat">KopiSpasial</p>
        {!compact && <p className="text-xs font-semibold text-oat/60">Panel admin</p>}
      </div>
    </Link>
  );
}
