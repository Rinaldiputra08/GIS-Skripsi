'use client';

import React from 'react';
import { MapPin, Navigation, Eye } from 'lucide-react';
import { googleMapsUrl, googleDirectionsUrl, googleStreetViewUrl } from '@/lib/maps-links';

interface Props {
  lat: number;
  lng: number;
  /** compact = untuk popup peta yang sempit */
  compact?: boolean;
  className?: string;
}

/** Tiga tombol ke Google Maps: lihat lokasi, petunjuk arah, Street View (tab baru). */
export const MapLinks: React.FC<Props> = ({ lat, lng, compact = false, className = '' }) => {
  const links = [
    { href: googleMapsUrl(lat, lng), icon: MapPin, label: 'Google Maps', title: 'Buka titik ini di Google Maps' },
    { href: googleDirectionsUrl(lat, lng), icon: Navigation, label: 'Arah', title: 'Petunjuk arah dari posisi Anda ke titik ini' },
    { href: googleStreetViewUrl(lat, lng), icon: Eye, label: 'Street View', title: 'Lihat foto jalan di sekitar titik ini' },
  ];
  return (
    <div className={`grid grid-cols-3 gap-1.5 ${className}`}>
      {links.map(({ href, icon: Icon, label, title }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={title}
          onClick={(e) => e.stopPropagation()}
          className={`flex items-center justify-center gap-1.5 rounded-xl border border-line-2 bg-paper font-bold !text-ink no-underline transition-colors hover:bg-oat-2 ${
            compact ? 'min-h-9 px-1.5 text-[11px]' : 'min-h-11 px-2 text-xs'
          }`}
        >
          <Icon className={compact ? 'h-3.5 w-3.5 shrink-0' : 'h-4 w-4 shrink-0'} />
          <span className="truncate">{label}</span>
        </a>
      ))}
    </div>
  );
};
