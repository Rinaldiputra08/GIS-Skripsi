'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface LoadState<T> { data: T | null; error: string; loading: boolean }

/**
 * Muat data asinkron saat mount / saat `deps` berubah, dengan `reload()` untuk memuat ulang
 * (mis. setelah menyimpan). State hanya diubah di dalam callback promise, bukan sinkron di effect.
 */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<LoadState<T>>({ data: null, error: '', loading: true });
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });

  useEffect(() => {
    let alive = true;
    fnRef.current()
      .then((data) => { if (alive) setState({ data, error: '', loading: false }); })
      .catch((e: Error) => { if (alive) setState((s) => ({ ...s, error: e.message, loading: false })); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
