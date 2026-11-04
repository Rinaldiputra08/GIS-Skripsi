'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Coffee, Lock, ArrowLeft, Loader2 } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Gagal masuk.');
        setBusy(false);
        return;
      }
      const next = params.get('next');
      router.replace(next && next.startsWith('/admin') ? next : '/admin');
      router.refresh();
    } catch {
      setError('Tidak dapat terhubung ke server.');
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-espresso text-lime">
          <Coffee className="h-6 w-6" strokeWidth={2.4} />
        </div>
        <div className="leading-tight">
          <h1 className="text-xl font-extrabold tracking-tight">KopiSpasial <span className="text-ink-3">Admin</span></h1>
          <p className="text-sm text-ink-3">Kelola data yang menjadi dasar rekomendasi</p>
        </div>
      </div>

      <form onSubmit={submit} className="card space-y-4 p-6" aria-describedby={error ? 'login-error' : undefined}>
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold">Email</span>
          <input
            type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full rounded-xl border border-line-2 bg-paper px-4 text-base outline-none focus:border-espresso focus:ring-2 focus:ring-lime"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold">Kata sandi</span>
          <input
            type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="h-12 w-full rounded-xl border border-line-2 bg-paper px-4 text-base outline-none focus:border-espresso focus:ring-2 focus:ring-lime"
          />
        </label>
        {error && (
          <p id="login-error" role="alert" className="rounded-xl bg-bad-bg px-3 py-2 text-sm font-semibold text-bad">{error}</p>
        )}
        <button type="submit" disabled={busy} className="btn btn-primary w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          {busy ? 'Memeriksa…' : 'Masuk'}
        </button>
      </form>

      <Link href="/" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-3 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Kembali ke peta
      </Link>
    </div>
  );
}
