/** Kategori pusat keramaian (C4): kode di database -> label. Dipakai server & klien. */
export const CROWD_CATEGORY_LABELS: Record<string, string> = {
  mall: 'Mal / Pusat Perbelanjaan',
  supermarket: 'Supermarket',
  marketplace: 'Pasar',
  park: 'Taman',
  attraction: 'Tempat Wisata',
  bus_station: 'Terminal',
  station: 'Stasiun',
  shelter: 'Halte',
  university: 'Kampus',
  hospital: 'Rumah Sakit',
  office: 'Perkantoran Instansi',
  school: 'Sekolah',
};

export const crowdCategoryLabel = (c: string) => CROWD_CATEGORY_LABELS[c] ?? c.replace(/_/g, ' ');
