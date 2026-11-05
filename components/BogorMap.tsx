'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  Polyline,
  Circle,
  CircleMarker,
  Rectangle,
  Tooltip,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import {
  CompetitorPoint,
  DistrictGeo,
  RoadSegment,
  CrowdCenterPoint,
  ExclusionZone,
  TopsisCandidateResult,
  LayerToggleState,
  FilterState,
  SurveyPointEvaluation,
} from '@/lib/types';
import { GRID_CELL_METERS } from '@/data/bogor-spatial';
import { getSettings } from '@/lib/settings';
import { cityOutline } from '@/lib/city-outline';
import { crowdCategoryLabel } from '@/lib/crowd-categories';
import {
  formatBusinessScore,
  getStarRating,
} from '@/lib/business-logic';
import {
  Map,
  Layers,
  Satellite,
  Moon,
  Sun,
  ShieldAlert,
  CheckCircle2,
  Compass,
  Crosshair,
  Navigation,
  LocateFixed,
  Loader2,
  Sparkles,
  XCircle,
  Award,
  AlertTriangle,
  Coffee,
  Star,
  CircleDot,
  Radio,
  Target,
  Info,
  X,
  MousePointerClick,
} from 'lucide-react';

// Fix Leaflet Default Marker Icon issues in Webpack/Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Penanda ringkas: kecil agar peta tidak penuh, tetap jelas saat di-zoom
const createCoffeeIcon = () => {
  return L.divIcon({
    className: 'custom-coffee-pin',
    html: `
      <div style="
        width: 22px; height: 22px; background: #2a1f18; border: 2px solid #ffffff; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 6px rgba(42,31,24,0.45);
      ">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#d4f254" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 8h1a4 4 0 1 1 0 8h-1"></path>
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path>
        </svg>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
};

const createCrowdIcon = (category: string) => {
  let bg = '#0e8fa0';
  if (category === 'mall' || category === 'supermarket') bg = '#7c5cff';
  if (category === 'marketplace') bg = '#d97706';
  if (category === 'station' || category === 'bus_station' || category === 'shelter') bg = '#2a5db0';
  if (category === 'park' || category === 'attraction') bg = '#12805c';
  if (category === 'university' || category === 'school') bg = '#b4235a';
  if (category === 'hospital' || category === 'office') bg = '#5b6573';

  return L.divIcon({
    className: 'custom-crowd-pin',
    html: `
      <div style="
        width: 18px; height: 18px; background: ${bg}; border: 2px solid #ffffff; border-radius: 6px;
        box-shadow: 0 2px 6px rgba(42,31,24,0.35);
        display: flex; align-items: center; justify-content: center;
      ">
        <span style="width:5px;height:5px;border-radius:50%;background:#fff;display:block"></span>
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
};

// Penanda titik survei dengan efek denyut
const createSurveyIcon = (category?: string) => {
  const isRecommended = category === 'high';
  const isRestricted = category === 'restricted';
  const main = isRestricted ? '#c2352b' : isRecommended ? '#12805c' : '#2a1f18';
  const pulse = isRestricted ? 'rgba(194,53,43,0.35)' : isRecommended ? 'rgba(18,128,92,0.35)' : 'rgba(42,31,24,0.3)';

  return L.divIcon({
    className: 'custom-survey-marker',
    html: `
      <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: ${pulse}; animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="
          position: relative; width: 28px; height: 28px; background: ${main}; border: 3px solid #ffffff; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(42,31,24,0.45);
        ">
          <span style="width:8px;height:8px;border-radius:50%;background:#d4f254;display:block"></span>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -22],
  });
};

// Map controller component to handle camera fly-to on selection or survey point
const MapController: React.FC<{
  selectedCandidate: TopsisCandidateResult | null;
  surveyResult: SurveyPointEvaluation | null;
}> = ({ selectedCandidate, surveyResult }) => {
  const map = useMap();

  // Panel (kartu kiri di desktop / bottom sheet di mobile) menutupi sebagian peta.
  // Titik tujuan diposisikan di tengah bagian peta yang masih terlihat.
  const flyToVisible = (lat: number, lng: number, zoom: number) => {
    const size = map.getSize();
    let targetX = size.x / 2;
    let targetY = size.y / 2;
    const panel = document.querySelector('aside[aria-label="Panel analisis"]') as HTMLElement | null;
    if (panel) {
      const r = panel.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        if (window.innerWidth >= 1024) {
          targetX = (r.right + size.x) / 2; // area bebas = kanan panel
        } else {
          targetY = Math.max(r.top, 0) / 2; // area bebas = di atas sheet
        }
      }
    }
    const targetPt = map.project([lat, lng], zoom);
    const centerPt = targetPt.add([size.x / 2 - targetX, size.y / 2 - targetY]);
    map.flyTo(map.unproject(centerPt, zoom), zoom, { duration: 1.2, easeLinearity: 0.25 });
  };

  useEffect(() => {
    if (surveyResult && surveyResult.isInsideBogor) {
      flyToVisible(surveyResult.lat, surveyResult.lng, 16);
    } else if (selectedCandidate) {
      flyToVisible(selectedCandidate.lat, selectedCandidate.lng, 16);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCandidate, surveyResult, map]);

  return null;
};

// Map Events Handler for Click to Pin-Drop Survey
const MapEventsHandler: React.FC<{
  isSurveyClickMode: boolean;
  onMapClick: (lat: number, lng: number) => void;
}> = ({ isSurveyClickMode, onMapClick }) => {
  useMapEvents({
    click(e) {
      if (isSurveyClickMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

// Peta dasar gratis tanpa API key (Esri & OpenStreetMap). CARTO kini mewajibkan API key sehingga tidak dipakai.
// Default "Terang" (abu-abu muda) agar warna data (hijau/kuning/merah) paling terbaca.
type BasemapKey = 'light' | 'osm' | 'satellite' | 'dark';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const BASEMAP_CONFIGS: Record<
  BasemapKey,
  { name: string; url: string; labels?: string; maxNativeZoom?: number; attribution: string; icon: React.ElementType }
> = {
  light: {
    name: 'Terang',
    url: `${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
    maxNativeZoom: 16,
    attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, OpenStreetMap contributors',
    icon: Sun,
  },
  osm: {
    name: 'Berwarna',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    icon: Map,
  },
  satellite: {
    name: 'Satelit',
    url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    icon: Satellite,
  },
  dark: {
    name: 'Gelap',
    url: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
    maxNativeZoom: 16,
    attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, OpenStreetMap contributors',
    icon: Moon,
  },
};

interface BogorMapProps {
  districts: DistrictGeo[];
  competitors: CompetitorPoint[];
  roads: RoadSegment[];
  crowdCenters: CrowdCenterPoint[];
  exclusionZones: ExclusionZone[];
  candidates: TopsisCandidateResult[];
  layers: LayerToggleState;
  filters: FilterState;
  selectedCandidate: TopsisCandidateResult | null;
  onSelectCandidate: (candidate: TopsisCandidateResult) => void;
  // Live Field Survey Props
  surveyResult?: SurveyPointEvaluation | null;
  onSurveyPointSelected?: (lat: number, lng: number) => void;
  onOpenSurveyModal?: () => void;
  onClearSurvey?: () => void;
  isSurveyClickMode?: boolean;
  onToggleSurveyClickMode?: () => void;
}

export const BogorMap: React.FC<BogorMapProps> = ({
  districts,
  competitors,
  roads,
  crowdCenters,
  exclusionZones,
  candidates,
  layers,
  filters,
  selectedCandidate,
  onSelectCandidate,
  surveyResult,
  onSurveyPointSelected,
  onOpenSurveyModal,
  onClearSurvey,
  isSurveyClickMode = false,
  onToggleSurveyClickMode,
}) => {
  const outline = useMemo(() => cityOutline(districts), [districts]);
  const [activeBasemap, setActiveBasemap] = useState<BasemapKey>('light');
  const [isBasemapMenuOpen, setIsBasemapMenuOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Filter candidates based on user-selected thresholds and Spatial Constraints
  const visibleCandidates = candidates.filter((c) => {
    if (filters.excludeRestricted && c.isRestricted) return false;
    if (c.score < filters.minScore) return false;
    if (filters.category !== 'all' && c.category !== filters.category) return false;
    if (filters.district !== 'ALL' && c.district.toLowerCase() !== filters.district.toLowerCase()) {
      return false;
    }
    return true;
  });

  // 10 titik teratas (di luar zona terlarang) diberi penekanan khusus di peta
  const topIds = new Set(
    candidates
      .filter((c) => !c.isRestricted)
      .slice(0, 10)
      .map((c) => c.id)
  );

  // Sel grid persegi (sisi = GRID_CELL_METERS): 1 sel = 1 titik kandidat
  const halfCellLat = GRID_CELL_METERS / 2 / 111320;
  const cellBounds = (lat: number, lng: number): [[number, number], [number, number]] => {
    const halfLng = GRID_CELL_METERS / 2 / (111320 * Math.cos((lat * Math.PI) / 180));
    return [
      [lat - halfCellLat, lng - halfLng],
      [lat + halfCellLat, lng + halfLng],
    ];
  };

  // Warna mengikuti kelas potensi (kuantil peringkat Vi, lihat lib/settings.ts -> tierOfRank)
  const getCandidateColor = (category: string) => {
    if (category === 'high') return '#12a56b'; // Hijau (potensi tinggi)
    if (category === 'medium') return '#f0a30a'; // Kuning (menengah)
    return '#e5484d'; // Merah (rendah)
  };

  const selectedBasemap = BASEMAP_CONFIGS[activeBasemap];

  // Handle GPS Current Position
  const handleUseGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Browser Anda tidak mendukung deteksi lokasi GPS.');
      setTimeout(() => setGpsError(null), 4000);
      return;
    }

    setIsGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsGpsLoading(false);
        const { latitude, longitude } = position.coords;
        if (onSurveyPointSelected) {
          onSurveyPointSelected(latitude, longitude);
        }
      },
      (error) => {
        setIsGpsLoading(false);
        let errorMsg = 'Gagal mendeteksi lokasi GPS.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Izin akses GPS ditolak oleh browser. Anda dapat menggunakan mode "Klik Titik di Peta".';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Sinyal GPS lokasi tidak tersedia.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Waktu permintaan GPS habis.';
        }
        setGpsError(errorMsg);
        setTimeout(() => setGpsError(null), 5000);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${
        isSurveyClickMode ? 'cursor-crosshair' : ''
      }`}
    >
      {/* Kontrol peta (kanan atas): peta dasar + aksi survei */}
      <div className="absolute right-3 top-[72px] z-[400] flex flex-col items-end gap-2 sm:right-4 sm:top-[84px]">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsBasemapMenuOpen(!isBasemapMenuOpen)}
            aria-expanded={isBasemapMenuOpen}
            aria-label="Ganti peta dasar"
            className="float-panel flex h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-[13px] font-bold text-ink transition-transform hover:scale-[1.03]"
          >
            <Layers className="h-4 w-4" />
            {selectedBasemap.name}
          </button>

          {isBasemapMenuOpen && (
            <div className="float-panel animate-in absolute right-0 mt-2 w-48 rounded-2xl p-1.5">
              {(Object.keys(BASEMAP_CONFIGS) as BasemapKey[]).map((key) => {
                const item = BASEMAP_CONFIGS[key];
                const Icon = item.icon;
                const isSelected = activeBasemap === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setActiveBasemap(key);
                      setIsBasemapMenuOpen(false);
                    }}
                    className={`flex min-h-[44px] w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left text-sm font-semibold transition-colors ${
                      isSelected ? 'bg-espresso text-white' : 'text-ink hover:bg-oat-2'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleUseGpsLocation}
          disabled={isGpsLoading}
          title="Evaluasi lokasi GPS perangkat Anda"
          aria-label="Survei lokasi saya"
          className="float-panel flex h-11 cursor-pointer items-center gap-2 rounded-full px-3.5 text-[13px] font-bold text-ink transition-transform hover:scale-[1.03] disabled:opacity-60 sm:px-4"
        >
          {isGpsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          <span className="hidden sm:inline">{isGpsLoading ? 'Mencari…' : 'Lokasi saya'}</span>
        </button>

        {onToggleSurveyClickMode && (
          <button
            type="button"
            onClick={onToggleSurveyClickMode}
            aria-pressed={isSurveyClickMode}
            title="Klik sembarang titik di peta untuk mengevaluasi kelayakannya"
            aria-label="Pilih titik di peta"
            className={`flex h-11 cursor-pointer items-center gap-2 rounded-full px-3.5 text-[13px] font-bold shadow-float transition-transform hover:scale-[1.03] sm:px-4 ${
              isSurveyClickMode ? 'bg-lime text-ink ring-2 ring-espresso' : 'float-panel text-ink'
            }`}
          >
            <MousePointerClick className="h-4 w-4" />
            <span className="hidden sm:inline">{isSurveyClickMode ? 'Klik di peta…' : 'Pilih di peta'}</span>
          </button>
        )}
      </div>

      {/* Hasil survei terkini (tengah atas) */}
      {surveyResult && onOpenSurveyModal && (
        <div className="animate-in absolute left-1/2 top-[72px] z-[400] flex -translate-x-1/2 items-center gap-1 rounded-full bg-espresso py-1 pl-1 pr-1 text-white shadow-float sm:top-[84px] lg:left-[calc(50%+210px)]">
          <button
            type="button"
            onClick={onOpenSurveyModal}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-full px-3.5 text-[13px] font-bold transition-colors hover:bg-white/10"
          >
            <span className="chip !px-2 !py-0.5 bg-lime text-ink">Survei</span>
            <span className="tabular font-mono">{surveyResult.score.toFixed(3)}</span>
            {surveyResult.districtName && <span className="hidden text-white/70 sm:inline">· {surveyResult.districtName}</span>}
          </button>
          {onClearSurvey && (
            <button
              type="button"
              onClick={onClearSurvey}
              title="Hapus titik survei"
              aria-label="Hapus titik survei"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Petunjuk mode klik */}
      {isSurveyClickMode && (
        <div className="animate-in absolute left-1/2 top-[72px] z-[390] -translate-x-1/2 rounded-full bg-espresso px-4 py-2.5 text-[13px] font-semibold text-white shadow-float sm:top-[84px] lg:left-[calc(50%+210px)]">
          <span className="flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-lime" />
            Ketuk titik di peta untuk menilai lokasinya
          </span>
        </div>
      )}

      {/* Galat GPS */}
      {gpsError && (
        <div
          role="alert"
          className="animate-in absolute left-1/2 top-[130px] z-[500] flex w-[min(92vw,380px)] -translate-x-1/2 items-start gap-2.5 rounded-2xl bg-bad-bg p-3.5 text-sm text-bad shadow-float sm:top-[140px] lg:left-[calc(50%+210px)]"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="leading-snug">{gpsError}</span>
        </div>
      )}

      <MapContainer
        center={[-6.5971, 106.7972]}
        zoom={13}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full"
      >
        <ZoomControl position="bottomright" />
        <MapController selectedCandidate={selectedCandidate} surveyResult={surveyResult ?? null} />

        {/* Map Click Event Handler for Field Survey */}
        <MapEventsHandler
          isSurveyClickMode={isSurveyClickMode}
          onMapClick={(lat, lng) => {
            if (onSurveyPointSelected) {
              onSurveyPointSelected(lat, lng);
            }
          }}
        />

        {/* Free Basemap Layer */}
        <TileLayer
          key={activeBasemap}
          attribution={selectedBasemap.attribution}
          url={selectedBasemap.url}
          maxZoom={19}
          maxNativeZoom={selectedBasemap.maxNativeZoom ?? 19}
        />
        {selectedBasemap.labels && (
          <TileLayer
            key={`${activeBasemap}-labels`}
            url={selectedBasemap.labels}
            maxZoom={19}
            maxNativeZoom={selectedBasemap.maxNativeZoom ?? 19}
            zIndex={5}
          />
        )}

        {/* 1. Districts Polygon Layer */}
        {layers.showDistricts &&
          districts.map((district) => (
            <Polygon
              key={district.id}
              positions={district.coordinates}
              pathOptions={{
                color: district.color,
                weight: 1.5,
                opacity: 0.7,
                fillColor: district.color,
                fillOpacity: 0.05,
                dashArray: '2, 5',
              }}
            >
              <Tooltip sticky>
                <div className="text-xs p-1 font-sans">
                  <strong className="block font-extrabold text-ink">Kecamatan {district.name}</strong>
                  <span className="block text-ink-2">{district.population.toLocaleString('id-ID')} jiwa</span>
                  <span className="block text-ink-3">{district.density.toLocaleString('id-ID')} jiwa/km²</span>
                </div>
              </Tooltip>
            </Polygon>
          ))}

        {/* 2. Exclusion Zones (Zona Restriksi / Lahan Terlarang) */}
        {layers.showExclusionZones &&
          exclusionZones.map((zone) => {
            const style = {
              color: '#c2352b',
              weight: 1.5,
              opacity: 0.9,
              dashArray: '5, 5',
              fillColor: '#e5484d',
              fillOpacity: 0.18,
            };
            const body = (
              <>
                <Popup>
                  <div className="w-[230px]">
                    <span className="chip bg-bad-bg text-bad">
                      <ShieldAlert className="h-3 w-3" /> Zona terlarang
                    </span>
                    <h4 className="mt-2 text-[15px] font-extrabold leading-snug text-ink">{zone.name}</h4>
                    <p className="mt-1 text-xs leading-snug text-ink-2">{zone.description}</p>
                    <p className="mt-2 border-t border-line pt-2 text-xs font-semibold text-bad">
                      {zone.radiusMeters
                        ? `Radius perlindungan ${zone.radiusMeters} m`
                        : zone.source === 'osm'
                          ? 'Batas area dari OpenStreetMap'
                          : 'Batas area poligon'}
                    </p>
                  </div>
                </Popup>
                <Tooltip sticky>
                  <div className="text-xs p-1 font-sans">
                    <strong className="block font-extrabold text-bad">{zone.name}</strong>
                    <span className="block text-ink-2">{zone.typeLabel} · zona terlarang</span>
                  </div>
                </Tooltip>
              </>
            );
            if (zone.radiusMeters) {
              return (
                <Circle key={zone.id} center={zone.center} radius={zone.radiusMeters} pathOptions={style}>
                  {body}
                </Circle>
              );
            }
            if (!zone.shape?.length) return null;
            return (
              <Polygon key={zone.id} positions={zone.shape} pathOptions={{ ...style, weight: 1.2 }}>
                {body}
              </Polygon>
            );
          })}

        {/* 3. Road Network Polylines */}
        {layers.showRoads &&
          roads.map((road) => (
            <Polyline
              key={road.id}
              positions={road.coordinates}
              pathOptions={{
                color: '#4b6cb7',
                weight: road.type === 'arterial' ? 3.5 : 2,
                opacity: 0.8,
              }}
            >
              <Tooltip sticky>
                <div className="text-xs p-1 font-sans">
                  <strong className="font-extrabold text-ink">{road.name}</strong>
                  <span className="block text-ink-2">
                    {road.type === 'arterial' ? 'Jalan arteri' : road.type === 'collector' ? 'Jalan kolektor' : 'Jalan lokal'}
                  </span>
                </div>
              </Tooltip>
            </Polyline>
          ))}

        {/* 4. Crowd Centers Markers */}
        {layers.showCrowdCenters &&
          crowdCenters.map((crowd) => (
            <Marker
              key={crowd.id}
              position={[crowd.lat, crowd.lng]}
              icon={createCrowdIcon(crowd.category)}
            >
              <Popup>
                <div className="w-[220px]">
                  <span className="chip bg-info-bg text-info">{crowdCategoryLabel(String(crowd.category))}</span>
                  <h4 className="mt-2 text-[15px] font-extrabold leading-snug text-ink">{crowd.name}</h4>
                  {crowd.description && <p className="mt-1 text-xs leading-snug text-ink-2">{crowd.description}</p>}
                  <p className="mt-2 border-t border-line pt-2 text-xs font-medium text-ink-3">Kecamatan {crowd.district}</p>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* 5. Competitor Coffee Shops Markers */}
        {layers.showCompetitors &&
          competitors.map((comp) => (
            <Marker
              key={comp.id}
              position={[comp.lat, comp.lng]}
              icon={createCoffeeIcon()}
            >
              <Popup>
                <div className="w-[240px]">
                  <span className="chip bg-mid-bg text-mid">Kompetitor</span>
                  <h4 className="mt-2 text-[15px] font-extrabold leading-snug text-ink">{comp.name}</h4>
                  {comp.address && <p className="mt-1 text-xs leading-snug text-ink-2">{comp.address}</p>}
                  <p className="mt-2 border-t border-line pt-2 text-xs font-medium text-ink-3">
                    {comp.category} · {comp.district}
                    {comp.source && <span className="text-ink-3"> · {comp.source === 'osm' ? 'OpenStreetMap' : 'Kaggle'}</span>}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* 6. TOPSIS Recommendation Candidates Layer */}
        {layers.showRecommendations &&
          visibleCandidates.map((candidate) => {
            const isTop1 = candidate.rank === 1;
            const isSelected = selectedCandidate?.id === candidate.id;
            const color = candidate.isRestricted ? '#ef4444' : getCandidateColor(candidate.category);
            const displayMode = layers.recommendationDisplayMode || 'both';
            const radiusMeters = layers.recommendationRadiusMeters || 250;
            const approxHectares = ((Math.PI * Math.pow(radiusMeters, 2)) / 10000).toFixed(1);

            const tierLabel = candidate.isRestricted
              ? 'Zona terlarang'
              : candidate.category === 'high'
              ? 'Potensi tinggi'
              : candidate.category === 'medium'
              ? 'Potensi sedang'
              : 'Potensi rendah';
            const tierCls = candidate.isRestricted
              ? 'bg-bad-bg text-bad'
              : candidate.category === 'high'
              ? 'bg-good-bg text-good'
              : candidate.category === 'medium'
              ? 'bg-mid-bg text-mid'
              : 'bg-bad-bg text-bad';

            const popupContent = (
              <Popup>
                <div className="w-[270px] font-sans">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className={`chip ${tierCls}`}>{tierLabel}</span>
                      <h4 className="mt-2 text-[15px] font-extrabold leading-tight text-ink">
                        {candidate.isRestricted ? 'Tidak diperingkat' : `#${candidate.rank}`} · {candidate.district}
                      </h4>
                      <p className="tabular font-mono text-[11px] text-ink-3">
                        {candidate.lat.toFixed(4)}, {candidate.lng.toFixed(4)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="tabular text-3xl font-extrabold leading-none text-ink">
                        {formatBusinessScore(candidate.score)}
                      </div>
                      <div className="mt-1 text-[11px] font-semibold text-ink-3">dari 100</div>
                      <div className="tabular font-mono text-[11px] text-ink-3">Vi {candidate.score.toFixed(3)}</div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
                    <div className="rounded-xl bg-oat px-3 py-2">
                      <div className="font-medium text-ink-3">Jarak kafe</div>
                      <div className="tabular font-mono text-[13px] font-bold text-ink">
                        {Math.round(candidate.c1_dist_competitor)} m
                      </div>
                    </div>
                    <div className="rounded-xl bg-oat px-3 py-2">
                      <div className="font-medium text-ink-3">Kepadatan{candidate.village ? ` · ${candidate.village}` : ''}</div>
                      <div className="tabular font-mono text-[13px] font-bold text-ink">
                        {candidate.c2_density.toLocaleString('id-ID')} /km²
                      </div>
                    </div>
                    <div className="rounded-xl bg-oat px-3 py-2">
                      <div className="font-medium text-ink-3">Akses jalan</div>
                      <div className="tabular font-mono text-[13px] font-bold text-ink">
                        {Math.round(candidate.c3_dist_road)} m
                      </div>
                    </div>
                    <div className="rounded-xl bg-oat px-3 py-2">
                      <div className="font-medium text-ink-3">Keramaian</div>
                      <div className="tabular font-mono text-[13px] font-bold text-ink">
                        {Math.round(candidate.c4_dist_crowd)} m
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 flex items-start gap-2 text-xs leading-snug text-ink-2">
                    <Radio className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" />
                    <span>
                      Titik ini pusat sel grid. Cari ruko atau lahan di dalam zona <b className="text-ink">±{radiusMeters} m</b> (~
                      {approxHectares} ha).
                    </span>
                  </p>

                  <p className="mt-2 border-t border-line pt-2 text-xs leading-snug text-ink-2">
                    {candidate.isRestricted ? (
                      <span className="text-bad">
                        <b>Lokasi dibatasi:</b> berada di zona {candidate.restrictionReason}, tidak diizinkan untuk usaha kedai kopi.
                      </span>
                    ) : candidate.category === 'high' ? (
                      <span>
                        <b className="text-good">Potensi sangat tinggi:</b> jarak kompetitor aman dengan aksesibilitas dan kepadatan yang
                        baik.
                      </span>
                    ) : candidate.category === 'medium' ? (
                      <span>
                        <b className="text-mid">Potensi moderat:</b> layak dipertimbangkan dengan penyesuaian segmen pasar.
                      </span>
                    ) : (
                      <span>
                        <b className="text-bad">Potensi rendah:</b> persaingan padat atau akses terbatas.
                      </span>
                    )}
                  </p>
                </div>
              </Popup>
            );

            return (
              <React.Fragment key={candidate.id}>
                {/* 1a. Sel grid (peta panas): menyatu tanpa tumpang tindih agar mudah dibaca */}
                {(displayMode === 'radius' || displayMode === 'both') && (
                  <Rectangle
                    bounds={cellBounds(candidate.lat, candidate.lng)}
                    pathOptions={{
                      stroke: false,
                      fillColor: color,
                      fillOpacity: isSelected ? 0.7 : candidate.category === 'high' ? 0.5 : candidate.category === 'medium' ? 0.36 : 0.26,
                    }}
                    eventHandlers={{ click: () => onSelectCandidate(candidate) }}
                  >
                    <Tooltip sticky>
                      <div className="text-xs p-1 font-sans">
                        <strong className="block font-extrabold text-ink">
                          {candidate.isRestricted ? 'Zona terlarang' : `#${candidate.rank}`} · {candidate.district}
                        </strong>
                        <span className="block text-ink-2">
                          Skor {formatBusinessScore(candidate.score)}/100
                        </span>
                      </div>
                    </Tooltip>
                    {displayMode === 'radius' && popupContent}
                  </Rectangle>
                )}

                {/* 1b. Zona radius (catchment) hanya untuk 10 teratas & titik terpilih.
                    Non-interaktif agar tidak menghalangi klik pada sel di bawahnya. */}
                {(displayMode === 'radius' || displayMode === 'both') && (isSelected || topIds.has(candidate.id)) && (
                  <Circle
                    center={[candidate.lat, candidate.lng]}
                    radius={radiusMeters}
                    interactive={false}
                    pathOptions={{
                      color: '#1f1813',
                      weight: isSelected ? 3 : 1.8,
                      opacity: isSelected ? 1 : 0.85,
                      dashArray: isSelected ? undefined : '6, 5',
                      fillColor: color,
                      fillOpacity: isSelected ? 0.22 : 0.12,
                    }}
                  />
                )}

                {/* 2. Centroid Point Marker (when mode is 'point' or 'both') */}
                {(displayMode === 'point' || displayMode === 'both') && (
                  <CircleMarker
                    center={[candidate.lat, candidate.lng]}
                    radius={isTop1 ? 10 : isSelected ? 8.5 : displayMode === 'both' ? 5.5 : 6.5}
                    pathOptions={{
                      color: '#ffffff',
                      weight: isTop1 || isSelected ? 3 : 1.5,
                      fillColor: color,
                      fillOpacity: 0.95,
                    }}
                    eventHandlers={{
                      click: () => onSelectCandidate(candidate),
                    }}
                  >
                    {popupContent}
                  </CircleMarker>
                )}

                {/* 3. Titik pusat untuk mode 'radius': hanya 10 teratas & terpilih */}
                {displayMode === 'radius' && (isSelected || topIds.has(candidate.id)) && (
                  <CircleMarker
                    center={[candidate.lat, candidate.lng]}
                    radius={isSelected ? 7 : 5}
                    pathOptions={{
                      color: '#ffffff',
                      weight: 1.5,
                      fillColor: color,
                      fillOpacity: 1,
                    }}
                    eventHandlers={{
                      click: () => onSelectCandidate(candidate),
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}

        {/* Batas luar Kota Bogor (selalu tampil, di atas grid): wilayah di luar garis = Kabupaten Bogor, tidak dihitung */}
        <Polyline
          positions={outline}
          pathOptions={{ color: '#1f1813', weight: 2.5, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }}
          interactive={false}
        />

        {/* 7. CUSTOM LIVE FIELD SURVEY MARKER & RADIUS */}
        {surveyResult && (
          <>
            {/* Catchment Circle around Survey Location */}
            {layers.recommendationDisplayMode !== 'point' && (
              <Circle
                center={[surveyResult.lat, surveyResult.lng]}
                radius={layers.recommendationRadiusMeters || 250}
                pathOptions={{
                  color: surveyResult.isRestricted ? '#c2352b' : '#1f1813',
                  weight: 2,
                  dashArray: '5, 5',
                  fillColor: surveyResult.isRestricted ? '#e5484d' : '#d4f254',
                  fillOpacity: 0.28,
                }}
              >
                <Tooltip sticky>
                  <div className="text-xs p-1 font-sans">
                    <strong className="block font-extrabold text-ink">
                      Zona survei ±{layers.recommendationRadiusMeters || 250} m
                    </strong>
                    <span className="block text-ink-2">
                      ~{((Math.PI * Math.pow(layers.recommendationRadiusMeters || 250, 2)) / 10000).toFixed(1)} ha
                    </span>
                  </div>
                </Tooltip>
              </Circle>
            )}

            <Marker
              position={[surveyResult.lat, surveyResult.lng]}
              icon={createSurveyIcon(surveyResult.category)}
              zIndexOffset={1000}
            >
              <Popup autoPan={true}>
                <div className="w-[260px] font-sans">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="chip bg-lime text-ink">
                        <Compass className="h-3 w-3" /> Titik survei
                      </span>
                      <h4 className="mt-2 text-[15px] font-extrabold leading-tight text-ink">
                        {surveyResult.districtName ? `Kecamatan ${surveyResult.districtName}` : 'Di luar Kota Bogor'}
                      </h4>
                      <p className="tabular font-mono text-[11px] text-ink-3">
                        {surveyResult.lat.toFixed(5)}, {surveyResult.lng.toFixed(5)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="tabular text-3xl font-extrabold leading-none text-ink">
                        {formatBusinessScore(surveyResult.score)}
                      </div>
                      <div className="mt-1 text-[11px] font-semibold text-ink-3">dari 100</div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
                    <div className="rounded-xl bg-oat px-3 py-2">
                      <div className="font-medium text-ink-3">Jarak kafe</div>
                      <div className="tabular font-mono text-[13px] font-bold text-ink">{surveyResult.c1_dist_competitor} m</div>
                    </div>
                    <div className="rounded-xl bg-oat px-3 py-2">
                      <div className="font-medium text-ink-3">Akses jalan</div>
                      <div className="tabular font-mono text-[13px] font-bold text-ink">{surveyResult.c3_dist_road} m</div>
                    </div>
                    <div className="rounded-xl bg-oat px-3 py-2">
                      <div className="font-medium text-ink-3">Keramaian</div>
                      <div className="tabular font-mono text-[13px] font-bold text-ink">{surveyResult.c4_dist_crowd} m</div>
                    </div>
                    <div className="rounded-xl bg-oat px-3 py-2">
                      <div className="font-medium text-ink-3">Status lahan</div>
                      <div className={`text-[13px] font-bold ${surveyResult.isRestricted ? 'text-bad' : 'text-good'}`}>
                        {surveyResult.isRestricted ? 'Terlarang' : 'Layak'}
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-snug text-ink-2">
                    Lingkaran di peta menunjukkan zona ±{layers.recommendationRadiusMeters || 250} m (sekitar 5 menit berjalan kaki).
                  </p>

                  {onOpenSurveyModal && (
                    <button
                      type="button"
                      onClick={onOpenSurveyModal}
                      className="btn btn-primary mt-3 w-full !min-h-[44px] !text-[13px]"
                    >
                      <Sparkles className="h-4 w-4" /> Laporan lengkap (SWOT)
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>

      {/* Legenda: tombol kecil yang membuka kartu penjelasan */}
      <div className="absolute left-3 top-[72px] z-[400] flex flex-col items-start gap-2 lg:bottom-4 lg:left-auto lg:right-[68px] lg:top-auto lg:flex-col-reverse lg:items-end">
        <button
          type="button"
          onClick={() => setIsLegendOpen((v) => !v)}
          aria-expanded={isLegendOpen}
          className="float-panel flex h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-[13px] font-bold text-ink transition-transform hover:scale-[1.03]"
        >
          <Info className="h-4 w-4" />
          Legenda
        </button>

        {isLegendOpen && (
          <div className="float-panel animate-in w-[260px] rounded-3xl p-4 text-[13px] text-ink-2">
            <h3 className="text-sm font-extrabold text-ink">Potensi lokasi (skor Vi relatif)</h3>
            <ul className="mt-2.5 flex flex-col gap-2">
              <li className="flex items-center gap-2.5">
                <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-[#12a56b]" />
                Potensi tinggi <span className="ml-auto tabular font-mono text-xs text-ink-3">{getSettings().tierHighPct}% teratas</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-[#f0a30a]" />
                Potensi sedang <span className="ml-auto tabular font-mono text-xs text-ink-3">{getSettings().tierMediumPct}% berikutnya</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-[#e5484d]" />
                Potensi rendah <span className="ml-auto tabular font-mono text-xs text-ink-3">sisanya</span>
              </li>
            </ul>
            {layers.recommendationDisplayMode !== 'point' && (
              <p className="mt-2.5 text-xs leading-snug text-ink-3">
                Lingkaran = zona ±{layers.recommendationRadiusMeters || 250} m di sekitar titik grid.
              </p>
            )}

            <h3 className="mt-4 border-t border-line pt-3 text-sm font-extrabold text-ink">Objek peta</h3>
            <ul className="mt-2.5 flex flex-col gap-2">
              <li className="flex items-center gap-2.5">
                <span className="h-[3px] w-5 shrink-0 rounded-full bg-[#1f1813]" />
                Batas Kota Bogor (luar garis = Kab. Bogor)
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-white bg-espresso shadow">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                </span>
                Kedai kopi eksisting <span className="ml-auto tabular font-mono text-xs text-ink-3">{competitors.length}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-4 w-4 shrink-0 rounded-md border-2 border-white bg-[#7c5cff] shadow" />
                Pusat keramaian
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-1 w-5 shrink-0 rounded bg-[#4b6cb7]" />
                Jalan arteri / kolektor
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-4 w-4 shrink-0 rounded-full border border-dashed border-[#c2352b] bg-bad-bg" />
                Zona terlarang
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-4 w-4 shrink-0 rounded-full border-[3px] border-white bg-espresso shadow" />
                Titik survei
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
