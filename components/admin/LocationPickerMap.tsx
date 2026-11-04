'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface PickerPoint { lat: number; lng: number; name?: string }

interface Props {
  value: { lat: number; lng: number } | null;
  onChange: (lat: number, lng: number) => void;
  /** titik lain sebagai konteks (mis. kompetitor yang sudah ada) */
  context?: PickerPoint[];
  /** radius (m) untuk zona terlarang */
  radius?: number;
  height?: number;
}

const BOGOR: [number, number] = [-6.5971, 106.806];

function ClickHandler({ onChange }: { onChange: Props['onChange'] }) {
  useMapEvents({ click: (e) => onChange(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Follow({ value }: { value: Props['value'] }) {
  const map = useMap();
  useEffect(() => {
    if (value) map.flyTo([value.lat, value.lng], Math.max(map.getZoom(), 15), { duration: 0.5 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng]);
  return null;
}

/** Peta mini untuk memilih lokasi dengan klik. Hanya dimuat di klien (lihat LocationPicker). */
export default function LocationPickerMap({ value, onChange, context = [], radius, height = 280 }: Props) {
  return (
    <MapContainer center={value ? [value.lat, value.lng] : BOGOR} zoom={value ? 16 : 12} style={{ height, width: '100%' }} className="rounded-2xl" scrollWheelZoom>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickHandler onChange={onChange} />
      <Follow value={value} />
      {context.map((p, i) => (
        <CircleMarker key={i} center={[p.lat, p.lng]} radius={4} pathOptions={{ color: '#756a5f', weight: 1, fillColor: '#a89d90', fillOpacity: 0.8 }} interactive={false} />
      ))}
      {value && radius ? (
        <Circle center={[value.lat, value.lng]} radius={radius} pathOptions={{ color: '#c2352b', weight: 1.5, dashArray: '5 5', fillColor: '#e5484d', fillOpacity: 0.18 }} interactive={false} />
      ) : null}
      {value && (
        <CircleMarker center={[value.lat, value.lng]} radius={9} pathOptions={{ color: '#2a1f18', weight: 3, fillColor: '#d4f254', fillOpacity: 1 }} interactive={false} />
      )}
    </MapContainer>
  );
}
