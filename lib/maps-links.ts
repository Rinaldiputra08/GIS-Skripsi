/**
 * Tautan ke Google Maps (Maps URLs resmi: https://developers.google.com/maps/documentation/urls).
 * Tanpa API key; di ponsel otomatis membuka aplikasi Google Maps.
 */
const ll = (lat: number, lng: number) => `${lat.toFixed(6)},${lng.toFixed(6)}`;

/** Pin di titik itu */
export const googleMapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${ll(lat, lng)}`;

/** Rute dari posisi pengguna saat ini ke titik itu */
export const googleDirectionsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${ll(lat, lng)}`;

/** Street View di (atau sedekat mungkin dengan) titik itu */
export const googleStreetViewUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${ll(lat, lng)}`;
