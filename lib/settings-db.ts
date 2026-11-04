/** Akses parameter sistem di Supabase (server saja). */
import { getSupabaseAdmin, isSupabaseConfigured } from './supabase';
import { DEFAULT_SETTINGS, SETTING_KEYS, applySettings, type AppSettings } from './settings';

let cache: { at: number; value: AppSettings; fromDb: boolean } | null = null;
const TTL_MS = 30_000;

export function invalidateSettingsCache() {
  cache = null;
}

/** Baca parameter dari database (cache 30 dtk), terapkan ke modul settings, dan kembalikan. */
export async function loadSettings(): Promise<AppSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return applySettings(cache.value);
  let value = { ...DEFAULT_SETTINGS };
  let fromDb = false;
  try {
    const client = getSupabaseAdmin();
    if (isSupabaseConfigured && client) {
      const { data, error } = await client.from('app_settings').select('key,value');
      if (!error && data) {
        for (const row of data) {
          const prop = SETTING_KEYS[row.key as string];
          const n = Number(row.value);
          if (prop && Number.isFinite(n)) value = { ...value, [prop]: n };
        }
        fromDb = true;
      }
    }
  } catch {
    /* pakai default */
  }
  cache = { at: Date.now(), value, fromDb };
  return applySettings(value);
}

export async function saveSettings(next: AppSettings, prev: AppSettings): Promise<void> {
  const client = getSupabaseAdmin();
  if (!client) throw new Error('Supabase belum dikonfigurasi');
  const reverse = Object.fromEntries(Object.entries(SETTING_KEYS).map(([k, v]) => [v, k])) as Record<keyof AppSettings, string>;
  const rows = (Object.keys(next) as (keyof AppSettings)[])
    .filter((k) => next[k] !== prev[k])
    .map((k) => ({ key: reverse[k], value: next[k], updated_at: new Date().toISOString() }));
  if (rows.length === 0) return;
  const { error } = await client.from('app_settings').upsert(rows, { onConflict: 'key' });
  if (error) throw new Error(error.message);
  invalidateSettingsCache();
}
