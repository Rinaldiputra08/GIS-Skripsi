'use client';

import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  Polyline,
  Circle,
  CircleMarker,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import {
  CompetitorPoint,
  DistrictGeo,
  RoadSegment,
  CrowdCenterPoint,
  TopsisCandidateResult,
  LayerToggleState,
  FilterState,
  SurveyPointEvaluation,
} from '@/lib/types';
import { BOGOR_EXCLUSION_ZONES } from '@/data/bogor-spatial';
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
} from 'lucide-react';

// Fix Leaflet Default Marker Icon issues in Webpack/Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom DivIcons for high visual appeal
const createCoffeeIcon = () => {
  return L.divIcon({
    className: 'custom-coffee-pin',
    html: `
      <div style="
        width: 26px;
        height: 26px;
        background: linear-gradient(135deg, #d97706, #78350f);
        border: 2px solid #fef3c7;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.5);
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 8h1a4 4 0 1 1 0 8h-1"></path>
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path>
          <line x1="6" y1="2" x2="6" y2="4"></line>
          <line x1="10" y1="2" x2="10" y2="4"></line>
          <line x1="14" y1="2" x2="14" y2="4"></line>
        </svg>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
};

const createCrowdIcon = (category: string) => {
  let bg = '#8b5cf6';
  if (category === 'mall') bg = '#ec4899';
  if (category === 'station') bg = '#3b82f6';
  if (category === 'park') bg = '#10b981';

  return L.divIcon({
    className: 'custom-crowd-pin',
    html: `
      <div style="
        width: 22px;
        height: 22px;
        background: ${bg};
        border: 2px solid #ffffff;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.4);
      ">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
          <path d="M2 12h20"></path>
        </svg>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
};

// Pulsing Animated Survey Pin Icon
const createSurveyIcon = (category?: string) => {
  const isRecommended = category === 'high';
  const isRestricted = category === 'restricted';
  const pulseColor = isRestricted
    ? 'rgba(239, 68, 68, 0.5)'
    : isRecommended
    ? 'rgba(16, 185, 129, 0.5)'
    : 'rgba(245, 158, 11, 0.5)';
  const mainGradient = isRestricted
    ? 'linear-gradient(135deg, #ef4444, #991b1b)'
    : isRecommended
    ? 'linear-gradient(135deg, #10b981, #047857)'
    : 'linear-gradient(135deg, #f59e0b, #b45309)';

  return L.divIcon({
    className: 'custom-survey-marker',
    html: `
      <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: ${pulseColor};
          animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          position: relative;
          width: 30px;
          height: 30px;
          background: ${mainGradient};
          border: 2.5px solid #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(0,0,0,0.6);
        ">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 2v3m0 14v3M2 12h3m14 0h3"></path>
          </svg>
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20],
  });
};

// Map controller component to handle camera fly-to on selection or survey point
const MapController: React.FC<{
  selectedCandidate: TopsisCandidateResult | null;
  surveyResult: SurveyPointEvaluation | null;
}> = ({ selectedCandidate, surveyResult }) => {
  const map = useMap();

  useEffect(() => {
    if (surveyResult && surveyResult.isInsideBogor) {
      map.flyTo([surveyResult.lat, surveyResult.lng], 16, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    } else if (selectedCandidate) {
      map.flyTo([selectedCandidate.lat, selectedCandidate.lng], 16, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
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

// Free Basemap Definitions without any API key requirement
type BasemapKey = 'osm' | 'carto_dark' | 'carto_light' | 'satellite';

const BASEMAP_CONFIGS: Record<
  BasemapKey,
  { name: string; url: string; attribution: string; icon: any }
> = {
  osm: {
    name: 'OpenStreetMap (Standar)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    icon: Map,
  },
  carto_dark: {
    name: 'CartoDB Dark Matter',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> & OpenStreetMap',
    icon: Moon,
  },
  carto_light: {
    name: 'CartoDB Positron (Terang)',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> & OpenStreetMap',
    icon: Sun,
  },
  satellite: {
    name: 'Esri Satelit / Citra',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    icon: Satellite,
  },
};

interface BogorMapProps {
  districts: DistrictGeo[];
  competitors: CompetitorPoint[];
  roads: RoadSegment[];
  crowdCenters: CrowdCenterPoint[];
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
  const [activeBasemap, setActiveBasemap] = useState<BasemapKey>('osm');
  const [isBasemapMenuOpen, setIsBasemapMenuOpen] = useState(false);
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

  const getCandidateColor = (score: number) => {
    if (score >= 0.62) return '#10b981'; // Green (High potential)
    if (score >= 0.45) return '#f59e0b'; // Amber (Medium)
    return '#f43f5e'; // Rose (Low)
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
      className={`relative w-full h-full min-h-[500px] overflow-hidden ${
        isSurveyClickMode ? 'cursor-crosshair' : ''
      }`}
    >
      {/* 1. Floating Field Survey Action Bar (Top Left) */}
      <div className="absolute top-4 left-4 z-[400] flex flex-wrap items-center gap-2 max-w-[calc(100%-160px)]">
        {/* GPS Live Button */}
        <button
          type="button"
          onClick={handleUseGpsLocation}
          disabled={isGpsLoading}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shadow-xl backdrop-blur-md transition-all cursor-pointer ${
            isGpsLoading
              ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50'
              : 'bg-slate-950/90 hover:bg-emerald-900/40 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 hover:border-emerald-400'
          }`}
          title="Gunakan koordinat GPS perangkat Anda saat ini untuk survei lapangan langsung"
        >
          {isGpsLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          ) : (
            <LocateFixed className="w-4 h-4 text-emerald-400" />
          )}
          <span>{isGpsLoading ? 'Mencari GPS...' : 'Survei GPS Saya'}</span>
        </button>

        {/* Pin-Drop Click Mode Toggle Button */}
        {onToggleSurveyClickMode && (
          <button
            type="button"
            onClick={onToggleSurveyClickMode}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shadow-xl backdrop-blur-md transition-all cursor-pointer ${
              isSurveyClickMode
                ? 'bg-amber-500 text-slate-950 border-2 border-white shadow-amber-500/50 ring-2 ring-amber-400 animate-pulse'
                : 'bg-slate-950/90 hover:bg-slate-900 text-slate-200 border border-slate-700/80'
            }`}
            title="Aktifkan mode klik sembarang titik di peta untuk evaluasi survei ruko/tanah"
          >
            <Crosshair className={`w-4 h-4 ${isSurveyClickMode ? 'text-slate-950' : 'text-amber-400'}`} />
            <span>{isSurveyClickMode ? 'Mode Klik Aktif (Klik Peta)' : 'Klik Titik di Peta'}</span>
          </button>
        )}

        {/* Quick Result Pill if Survey Point Active */}
        {surveyResult && onOpenSurveyModal && (
          <div className="flex items-center gap-1.5 bg-slate-950/95 border border-emerald-500/50 rounded-xl px-3 py-1.5 shadow-xl text-xs backdrop-blur-md animate-in fade-in zoom-in-95">
            <button
              onClick={onOpenSurveyModal}
              className="flex items-center gap-1.5 text-emerald-300 hover:text-white font-bold cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Survei: <strong className="font-mono">{surveyResult.score.toFixed(3)}</strong>
                {surveyResult.districtName ? ` (${surveyResult.districtName})` : ''}
              </span>
            </button>

            {onClearSurvey && (
              <button
                onClick={onClearSurvey}
                className="text-slate-400 hover:text-rose-400 p-0.5 ml-1 transition-colors cursor-pointer"
                title="Hapus Titik Survei"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* GPS Error Notification Toast */}
      {gpsError && (
        <div className="absolute top-16 left-4 z-[500] max-w-sm p-3 rounded-xl bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs shadow-2xl backdrop-blur-md flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="block text-white font-bold">Informasi GPS</strong>
            <span>{gpsError}</span>
          </div>
        </div>
      )}

      {/* Floating Survey Mode Banner when active */}
      {isSurveyClickMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[400] px-4 py-2 rounded-full bg-amber-950/90 border border-amber-500/60 text-amber-200 text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in">
          <Crosshair className="w-4 h-4 text-amber-400 animate-spin" />
          <span>Klik di mana saja pada peta Kota Bogor untuk mengevaluasi kelayakan lokasi tersebut</span>
        </div>
      )}

      {/* Floating Basemap Selector Widget (Top Right) */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col items-end">
        <button
          type="button"
          onClick={() => setIsBasemapMenuOpen(!isBasemapMenuOpen)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-700/80 text-white text-xs font-semibold shadow-xl backdrop-blur-md transition-all cursor-pointer"
          title="Ganti Jenis Peta Dasar (Basemap)"
        >
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>{selectedBasemap.name}</span>
        </button>

        {isBasemapMenuOpen && (
          <div className="mt-2 w-52 p-2 rounded-xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-lg flex flex-col gap-1 text-xs animate-in fade-in zoom-in-95 duration-150">
            <span className="text-[10px] text-slate-400 font-bold px-2 py-1 uppercase tracking-wider">
              Pilihan Peta Dasar:
            </span>
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
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-950/70 text-emerald-300 font-bold border border-emerald-500/40'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate">{item.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <MapContainer
        center={[-6.5971, 106.7972]}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
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
        />

        {/* 1. Districts Polygon Layer */}
        {layers.showDistricts &&
          districts.map((district) => (
            <Polygon
              key={district.id}
              positions={district.coordinates}
              pathOptions={{
                color: district.color,
                weight: 2,
                opacity: 0.8,
                fillColor: district.color,
                fillOpacity: 0.12,
                dashArray: '4, 4',
              }}
            >
              <Tooltip sticky>
                <div className="text-xs p-1 font-sans">
                  <strong className="block text-slate-900 font-bold">
                    Kecamatan {district.name}
                  </strong>
                  <span className="text-slate-600 block">
                    Populasi: {district.population.toLocaleString('id-ID')} jiwa
                  </span>
                  <span className="text-slate-500 text-[10px] block">
                    Kepadatan: {district.density.toLocaleString('id-ID')} jiwa/km²
                  </span>
                </div>
              </Tooltip>
            </Polygon>
          ))}

        {/* 2. Exclusion Zones (Zona Restriksi / Lahan Terlarang) */}
        {layers.showExclusionZones &&
          BOGOR_EXCLUSION_ZONES.map((zone) => (
            <Circle
              key={zone.id}
              center={zone.center}
              radius={zone.radiusMeters}
              pathOptions={{
                color: '#e11d48',
                weight: 2,
                opacity: 0.9,
                dashArray: '6, 6',
                fillColor: '#f43f5e',
                fillOpacity: 0.25,
              }}
            >
              <Popup>
                <div className="p-1.5 space-y-1 text-slate-100 max-w-[230px]">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] uppercase font-bold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Zona Restriksi
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-white leading-snug">{zone.name}</h4>
                  <p className="text-[11px] text-slate-300">{zone.description}</p>
                  <div className="text-[10px] text-rose-300 font-semibold pt-1 border-t border-slate-800">
                    Radius Perlindungan: {zone.radiusMeters} meter
                  </div>
                </div>
              </Popup>
              <Tooltip sticky>
                <div className="text-xs p-1 font-sans">
                  <strong className="text-rose-700 block">⚠️ {zone.name}</strong>
                  <span className="text-slate-600 text-[10px] block">{zone.typeLabel} (Zona Terlarang)</span>
                </div>
              </Tooltip>
            </Circle>
          ))}

        {/* 3. Road Network Polylines */}
        {layers.showRoads &&
          roads.map((road) => (
            <Polyline
              key={road.id}
              positions={road.coordinates}
              pathOptions={{
                color: '#0284c7',
                weight: road.type === 'arterial' ? 4 : 2.5,
                opacity: 0.85,
              }}
            >
              <Tooltip sticky>
                <div className="text-xs p-1 font-sans">
                  <strong className="text-slate-900">{road.name}</strong>
                  <span className="text-slate-500 block text-[10px]">
                    Tipe: {road.type.toUpperCase()}
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
                <div className="p-1 space-y-1 text-slate-100 max-w-[220px]">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] uppercase font-bold">
                      {crowd.category}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-white leading-snug">{crowd.name}</h4>
                  {crowd.description && (
                    <p className="text-[11px] text-slate-300">{crowd.description}</p>
                  )}
                  <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800">
                    Kecamatan: {crowd.district}
                  </div>
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
                <div className="p-1 space-y-1.5 text-slate-100 max-w-[240px]">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] uppercase font-bold">
                      Kompetitor Eksisting
                    </span>
                    <span className="text-[10px] text-slate-400">{comp.category}</span>
                  </div>
                  <h4 className="font-bold text-xs text-white leading-snug">{comp.name}</h4>
                  {comp.address && (
                    <p className="text-[11px] text-slate-300">{comp.address}</p>
                  )}
                  <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800">
                    Wilayah: {comp.district}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* 6. TOPSIS Recommendation Candidates Layer */}
        {layers.showRecommendations &&
          visibleCandidates.map((candidate) => {
            const isTop1 = candidate.rank === 1;
            const isSelected = selectedCandidate?.id === candidate.id;
            const color = candidate.isRestricted ? '#ef4444' : getCandidateColor(candidate.score);
            const displayMode = layers.recommendationDisplayMode || 'both';
            const radiusMeters = layers.recommendationRadiusMeters || 250;
            const approxHectares = ((Math.PI * Math.pow(radiusMeters, 2)) / 10000).toFixed(1);

            const popupContent = (
              <Popup>
                <div className="p-2 space-y-2 text-slate-100 min-w-[270px] font-sans">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-1.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs font-bold text-white">
                          Peringkat #{candidate.rank}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {candidate.district}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Centroid: {candidate.lat.toFixed(4)}, {candidate.lng.toFixed(4)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-sans">Skor Kelayakan</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-black font-mono text-emerald-400">
                          {formatBusinessScore(candidate.score)}/100
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          (Vi: {candidate.score.toFixed(3)})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Radius Catchment Area Explanation (Metodologi Skripsi) */}
                  <div className="flex items-start gap-1.5 text-[10px] p-2 rounded bg-blue-950/50 border border-blue-800/60 text-blue-200">
                    <Radio className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <div className="leading-snug">
                      <strong className="text-blue-300 block">Zona Potensi (Radius ±{radiusMeters}m):</strong>
                      <span>
                        Titik ini adalah <em>Centroid</em> sel grid. Pengusaha disarankan menyurvei ketersediaan ruko/lahan sewa di dalam radius ini (~{approxHectares} ha).
                      </span>
                    </div>
                  </div>

                  {/* Land Suitability Tag */}
                  <div className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded bg-slate-950 border border-slate-800">
                    {candidate.isRestricted ? (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> {candidate.restrictionReason}
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Kawasan Komersial &amp; Permukiman Layak Usaha
                      </span>
                    )}
                  </div>

                  {/* Criteria Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Persaingan Kafe:</span>
                      <strong className="text-white font-mono">
                        {Math.round(candidate.c1_dist_competitor)} m
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Populasi Warga:</span>
                      <strong className="text-white font-mono">
                        {candidate.c2_population.toLocaleString('id-ID')} jiwa
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Akses Jalan:</span>
                      <strong className="text-white font-mono">
                        {Math.round(candidate.c3_dist_road)} m
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Keramaian:</span>
                      <strong className="text-white font-mono">
                        {Math.round(candidate.c4_dist_crowd)} m
                      </strong>
                    </div>
                  </div>

                  {/* Rationale description */}
                  <div className="text-[10px] text-slate-300 leading-snug bg-emerald-950/20 p-1.5 rounded border border-emerald-900/30">
                    {candidate.isRestricted ? (
                      <span className="text-rose-300">
                        ⚠️ <strong>Lokasi Dibatasi:</strong> Titik ini berada di zona {candidate.restrictionReason} sehingga tidak diizinkan untuk pendirian usaha kedai kopi.
                      </span>
                    ) : candidate.score >= 0.62 ? (
                      <span>
                        ⭐ <strong>Potensi Sangat Tinggi:</strong> Memiliki kombinasi jarak kompetitor yang aman dan aksesibilitas/populasi prima.
                      </span>
                    ) : candidate.score >= 0.45 ? (
                      <span>
                        🟡 <strong>Potensi Moderat:</strong> Layak dipertimbangkan dengan penyesuaian segmentasi pasar.
                      </span>
                    ) : (
                      <span>
                        🔴 <strong>Potensi Rendah:</strong> Tingkat saturasi kompetitor tinggi atau aksesibilitas terbatas.
                      </span>
                    )}
                  </div>
                </div>
              </Popup>
            );

            return (
              <React.Fragment key={candidate.id}>
                {/* 1. Catchment Buffer Radius Circle (when mode is 'radius' or 'both') */}
                {(displayMode === 'radius' || displayMode === 'both') && (
                  <Circle
                    center={[candidate.lat, candidate.lng]}
                    radius={radiusMeters}
                    pathOptions={{
                      color: isSelected ? '#ffffff' : isTop1 ? '#fbbf24' : color,
                      weight: isSelected ? 3 : isTop1 ? 2.5 : candidate.score >= 0.62 ? 1.5 : 1,
                      opacity: isSelected ? 0.95 : isTop1 ? 0.85 : 0.65,
                      dashArray: isSelected ? undefined : isTop1 ? '6, 4' : '4, 4',
                      fillColor: color,
                      fillOpacity: isSelected
                        ? 0.38
                        : isTop1
                        ? 0.30
                        : candidate.score >= 0.62
                        ? 0.20
                        : 0.10,
                    }}
                    eventHandlers={{
                      click: () => onSelectCandidate(candidate),
                    }}
                  >
                    <Tooltip sticky>
                      <div className="text-xs p-1 font-sans">
                        <strong className="text-emerald-700 block">
                          🎯 Zona Potensi #{candidate.rank} (Radius {radiusMeters}m)
                        </strong>
                        <span className="text-slate-600 text-[10px] block">
                          Kecamatan {candidate.district} • Skor: {formatBusinessScore(candidate.score)}/100
                        </span>
                        <span className="text-slate-500 text-[9px] block">
                          Area Penyangga: ~{approxHectares} ha
                        </span>
                      </div>
                    </Tooltip>
                    {displayMode === 'radius' && popupContent}
                  </Circle>
                )}

                {/* 2. Centroid Point Marker (when mode is 'point' or 'both') */}
                {(displayMode === 'point' || displayMode === 'both') && (
                  <CircleMarker
                    center={[candidate.lat, candidate.lng]}
                    radius={isTop1 ? 10 : isSelected ? 8.5 : displayMode === 'both' ? 5.5 : 6.5}
                    pathOptions={{
                      color: isSelected ? '#ffffff' : isTop1 ? '#f59e0b' : color,
                      weight: isTop1 || isSelected ? 3 : 1.5,
                      fillColor: color,
                      fillOpacity: isSelected || isTop1 ? 0.95 : 0.8,
                    }}
                    eventHandlers={{
                      click: () => onSelectCandidate(candidate),
                    }}
                  >
                    {popupContent}
                  </CircleMarker>
                )}

                {/* 3. Subtle Anchor Dot for 'radius' mode only so center is distinguishable */}
                {displayMode === 'radius' && (
                  <CircleMarker
                    center={[candidate.lat, candidate.lng]}
                    radius={isTop1 || isSelected ? 4 : 2.5}
                    pathOptions={{
                      color: '#ffffff',
                      weight: 1,
                      fillColor: color,
                      fillOpacity: 0.9,
                    }}
                    eventHandlers={{
                      click: () => onSelectCandidate(candidate),
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}

        {/* 7. CUSTOM LIVE FIELD SURVEY MARKER & RADIUS */}
        {surveyResult && (
          <>
            {/* Catchment Circle around Survey Location */}
            {layers.recommendationDisplayMode !== 'point' && (
              <Circle
                center={[surveyResult.lat, surveyResult.lng]}
                radius={layers.recommendationRadiusMeters || 250}
                pathOptions={{
                  color: surveyResult.isRestricted ? '#ef4444' : '#10b981',
                  weight: 2,
                  dashArray: '5, 5',
                  fillColor: surveyResult.isRestricted ? '#f43f5e' : '#34d399',
                  fillOpacity: 0.22,
                }}
              >
                <Tooltip sticky>
                  <div className="text-xs p-1 font-sans">
                    <strong className="text-emerald-700 block">
                      📍 Area Tangkapan Survei (Radius {layers.recommendationRadiusMeters || 250}m)
                    </strong>
                    <span className="text-slate-500 text-[9px] block">
                      Area Jangkauan: ~{((Math.PI * Math.pow(layers.recommendationRadiusMeters || 250, 2)) / 10000).toFixed(1)} ha
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
                <div className="p-2 space-y-2 text-slate-100 min-w-[270px] font-sans">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase flex items-center gap-1">
                      <Compass className="w-3 h-3" /> Titik Survei Lapangan
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      Vi: {surveyResult.score.toFixed(4)}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-white">
                      {surveyResult.districtName ? `Kecamatan ${surveyResult.districtName}` : 'Luar Kota Bogor'}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {surveyResult.lat.toFixed(5)}, {surveyResult.lng.toFixed(5)}
                    </span>
                  </div>

                  {/* Catchment Info for Survey */}
                  <div className="text-[10px] text-emerald-300 bg-emerald-950/40 p-1.5 rounded border border-emerald-900/40">
                    <span>
                      🎯 <strong>Catchment Radius {layers.recommendationRadiusMeters || 250}m:</strong> Lingkaran hijau di peta menunjukkan area jangkauan 5 menit jalan kaki dari titik survei ini.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-slate-950 p-1.5 rounded border border-slate-800">
                    <div>
                      <span className="text-slate-400 block">Jarak Kompetitor:</span>
                      <strong className="text-amber-300 font-mono">{surveyResult.c1_dist_competitor} m</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Akses Jalan Utama:</span>
                      <strong className="text-cyan-300 font-mono">{surveyResult.c3_dist_road} m</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Pusat Keramaian:</span>
                      <strong className="text-purple-300 font-mono">{surveyResult.c4_dist_crowd} m</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Status Lahan:</span>
                      <strong className={surveyResult.isRestricted ? 'text-rose-400' : 'text-emerald-400'}>
                        {surveyResult.isRestricted ? 'Restriksi' : 'Layak'}
                      </strong>
                    </div>
                  </div>

                  {onOpenSurveyModal && (
                    <button
                      onClick={onOpenSurveyModal}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Lihat Diagnosa Lengkap (SWOT & TOPSIS)</span>
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>

      {/* Floating Map Legend Overlay */}
      <div className="absolute bottom-5 right-5 z-[400] bg-slate-950/90 border border-slate-800/90 backdrop-blur-md p-3 rounded-xl shadow-xl text-xs space-y-2 max-w-[220px]">
        <span className="font-bold text-slate-200 text-[11px] block border-b border-slate-800 pb-1">
          Legenda Peta SIG
        </span>

        <div className="space-y-1.5 text-[11px]">
          {(layers.recommendationDisplayMode !== 'point') && (
            <div className="flex items-center gap-2 text-slate-300 pb-1 border-b border-slate-800/60">
              <span className="w-3.5 h-3.5 rounded-full border border-dashed border-emerald-400 bg-emerald-500/25" />
              <span className="text-emerald-300 font-medium">Zona Radius (±{layers.recommendationRadiusMeters || 250}m)</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span>Sangat Direkomendasikan (≥ 0.62)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Potensial Menengah (0.45 - 0.62)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
            <span>Prioritas Rendah (&lt; 0.45)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300 pt-1 border-t border-slate-800/70">
            <span className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
            <span className="text-emerald-300 font-semibold">Titik Survei Lapangan (GPS/Pin)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-3 h-3 rounded bg-rose-700/80 border border-rose-400 border-dashed" />
            <span>Zona Restriksi (Kuburan/Polisi)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-3 h-3 rounded-full bg-amber-700 border border-amber-300" />
            <span>Kedai Kopi Eksisting (60+)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-3 h-3 rounded bg-purple-500" />
            <span>Simpul Keramaian (Mall/Stasiun)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-4 h-1 rounded bg-sky-500" />
            <span>Jalan Utama Arteri/Kolektor</span>
          </div>
        </div>
      </div>
    </div>
  );
};
