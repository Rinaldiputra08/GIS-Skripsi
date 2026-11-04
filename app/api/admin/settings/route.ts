import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { loadSettings, saveSettings } from '@/lib/settings-db';
import { GRID_AFFECTING, validateSettings, SETTING_META } from '@/lib/settings';
import { invalidateSpatialCache } from '@/lib/spatial-db';
import { logAudit } from '@/lib/admin-resources';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ success: true, settings: await loadSettings(), meta: SETTING_META });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ success: false, error: 'Body tidak valid.' }, { status: 400 });

  const prev = { ...(await loadSettings()) };
  const v = validateSettings(body, prev);
  if (!v.ok) return NextResponse.json({ success: false, error: v.error }, { status: 400 });
  const changed = (Object.keys(v.value) as (keyof typeof prev)[]).filter((k) => v.value[k] !== prev[k]);
  if (changed.length === 0) return NextResponse.json({ success: true, settings: prev, changed: [] });

  try {
    await saveSettings(v.value, prev);
  } catch (err) {
    return NextResponse.json({ success: false, error: `Gagal menyimpan: ${(err as Error).message}. Pastikan supabase/cms.sql sudah dijalankan.` }, { status: 500 });
  }
  invalidateSpatialCache('all');
  await logAudit({
    actor: auth.email, action: 'update', entity: 'settings', label: changed.join(', '),
    before: Object.fromEntries(changed.map((k) => [k, prev[k]])),
    after: Object.fromEntries(changed.map((k) => [k, v.value[k]])),
    affectsGrid: changed.some((k) => GRID_AFFECTING.includes(k)),
  });
  return NextResponse.json({ success: true, settings: v.value, changed });
}
