/**
 * Definisi sumber data yang dikelola lewat CMS admin (kompetitor, simpul keramaian, zona terlarang)
 * beserta validasinya. Dipakai route handler /api/admin/[resource] (server saja).
 */
import { getSupabaseAdmin } from './supabase';
import { ZONE_TYPES } from './zone-types';

export type FieldKind = 'string' | 'number' | 'enum';

export interface FieldSpec {
  key: string;            // nama kolom di database
  label: string;
  kind: FieldKind;
  required?: boolean;
  maxLen?: number;
  min?: number;
  max?: number;
  options?: string[];     // untuk enum
  default?: string | number;
}

export interface ResourceConfig {
  table: string;
  entity: string;          // nama entitas di audit_log
  /** perubahan memengaruhi grid_points (perlu "Terapkan") */
  affectsGrid: boolean;
  /** titik dengan latitude/longitude (geom ikut diisi) */
  isPoint: boolean;
  orderBy: string;
  /** kolom yang ikut dikirim ke klien */
  select: string;
  fields: FieldSpec[];
  /** nilai tetap saat membuat baris baru */
  createDefaults: Record<string, unknown>;
  /** view bersih (hanya data dalam batas kota) untuk menandai inCity */
  cityView?: string;
  /** daftar bidang untuk label di audit */
  labelKey: string;
}

// Kotak pembatas sekitar Kota Bogor (cek kasar sebelum cek poligon oleh database)
const LAT: [number, number] = [-6.70, -6.48];
const LNG: [number, number] = [106.70, 106.88];

const latField: FieldSpec = { key: 'latitude', label: 'Latitude', kind: 'number', required: true, min: LAT[0], max: LAT[1] };
const lngField: FieldSpec = { key: 'longitude', label: 'Longitude', kind: 'number', required: true, min: LNG[0], max: LNG[1] };


export const RESOURCES: Record<string, ResourceConfig> = {
  competitors: {
    table: 'competitors',
    entity: 'competitors',
    affectsGrid: true,
    isPoint: true,
    orderBy: 'name',
    select: 'id,name,address,latitude,longitude,rating,total_reviews,source,category,osm_id,business_type,updated_at',
    cityView: 'v_competitors',
    labelKey: 'name',
    createDefaults: { business_type: 'coffee_shop', source: 'manual' },
    fields: [
      { key: 'name', label: 'Nama', kind: 'string', required: true, maxLen: 120 },
      { key: 'address', label: 'Alamat', kind: 'string', maxLen: 300 },
      { key: 'category', label: 'Kategori', kind: 'enum', options: ['Coffee shop', 'Cafe'], default: 'Coffee shop' },
      latField,
      lngField,
      { key: 'rating', label: 'Rating', kind: 'number', min: 0, max: 5 },
    ],
  },
  'crowd-centers': {
    table: 'crowd_centers',
    entity: 'crowd_centers',
    affectsGrid: true,
    isPoint: true,
    orderBy: 'name',
    select: 'id,name,category,latitude,longitude,osm_id,source,updated_at',
    cityView: 'v_crowd_centers',
    labelKey: 'name',
    createDefaults: { source: 'manual' },
    fields: [
      { key: 'name', label: 'Nama', kind: 'string', required: true, maxLen: 120 },
      { key: 'category', label: 'Kategori', kind: 'string', required: true, maxLen: 40 },
      latField,
      lngField,
    ],
  },
  zones: {
    table: 'restricted_zones',
    entity: 'restricted_zones',
    affectsGrid: false,
    isPoint: false,
    orderBy: 'name',
    select: 'id,code,name,zone_type,type_label,description,latitude,longitude,radius_m,source,osm_ref,updated_at',
    labelKey: 'name',
    createDefaults: { source: 'manual' },
    fields: [
      { key: 'name', label: 'Nama', kind: 'string', required: true, maxLen: 120 },
      { key: 'zone_type', label: 'Jenis zona', kind: 'enum', required: true, options: Object.keys(ZONE_TYPES) },
      { key: 'description', label: 'Keterangan', kind: 'string', maxLen: 300 },
      latField,
      lngField,
      { key: 'radius_m', label: 'Radius (m)', kind: 'number', required: true, min: 20, max: 3000 },
    ],
  },
};

type Row = Record<string, unknown>;

/** Validasi + normalisasi input. partial = true untuk PUT (hanya kolom yang dikirim). */
export function validateInput(cfg: ResourceConfig, input: Row, partial: boolean): { ok: true; data: Row } | { ok: false; error: string } {
  const data: Row = {};
  for (const f of cfg.fields) {
    const raw = input[f.key];
    const missing = raw === undefined || raw === null || raw === '';
    if (missing) {
      if (f.required && (!partial || raw === '' || raw === null)) return { ok: false, error: `${f.label} wajib diisi.` };
      if (partial) {
        if ((raw === '' || raw === null) && !f.required) data[f.key] = null; // kosongkan kolom opsional
        continue;
      }
      if (f.default !== undefined) data[f.key] = f.default;
      continue;
    }
    if (f.kind === 'number') {
      const n = Number(raw);
      if (!Number.isFinite(n)) return { ok: false, error: `${f.label} harus berupa angka.` };
      if ((f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) {
        return { ok: false, error: `${f.label} harus berada di antara ${f.min} dan ${f.max}.` };
      }
      data[f.key] = f.key === 'latitude' || f.key === 'longitude' ? Math.round(n * 1e6) / 1e6 : n;
    } else if (f.kind === 'enum') {
      const s = String(raw);
      if (!f.options!.includes(s)) return { ok: false, error: `${f.label} tidak valid.` };
      data[f.key] = s;
    } else {
      const s = String(raw).trim();
      if (f.required && s.length === 0) return { ok: false, error: `${f.label} wajib diisi.` };
      if (f.maxLen && s.length > f.maxLen) return { ok: false, error: `${f.label} maksimal ${f.maxLen} karakter.` };
      data[f.key] = s.length ? s : null;
    }
  }
  if (!partial) {
    for (const f of cfg.fields) if (data[f.key] === undefined && f.default !== undefined) data[f.key] = f.default;
  }
  if (cfg.table === 'restricted_zones' && data.zone_type) data.type_label = ZONE_TYPES[data.zone_type as string];
  if (cfg.isPoint && data.latitude !== undefined && data.longitude !== undefined) {
    // diisi juga oleh trigger database; dikirim eksplisit agar tetap benar bila trigger belum dipasang
    data.geom = `SRID=4326;POINT(${data.longitude} ${data.latitude})`;
  }
  return { ok: true, data };
}

// ---------------------------------------------------------------------
// Riwayat perubahan
// ---------------------------------------------------------------------
export interface AuditEntry {
  actor: string;
  action: 'create' | 'update' | 'delete' | 'apply';
  entity: string;
  entityId?: string | null;
  label?: string | null;
  before?: unknown;
  after?: unknown;
  affectsGrid?: boolean;
}

export async function logAudit(e: AuditEntry): Promise<void> {
  try {
    const client = getSupabaseAdmin();
    if (!client) return;
    await client.from('audit_log').insert({
      actor: e.actor,
      action: e.action,
      entity: e.entity,
      entity_id: e.entityId ?? null,
      label: e.label ?? null,
      before: e.before ?? null,
      after: e.after ?? null,
      affects_grid: e.affectsGrid ?? false,
    });
  } catch (err) {
    console.warn('[audit] gagal mencatat:', (err as Error).message);
  }
}

/** Buang kolom teknis sebelum disimpan sebagai jejak audit */
export function auditSnapshot(row: Row | null | undefined): Row | null {
  if (!row) return null;
  const { geom: _geom, ...rest } = row;
  void _geom;
  return rest;
}
