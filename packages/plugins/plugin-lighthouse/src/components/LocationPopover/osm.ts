//
// Copyright 2026 DXOS.org
//

// Ported from lighthouse `web/src/kit/geo.tsx`.

/**
 * OpenStreetMap's standard tiles. The tile usage policy asks for the attribution below, a valid Referer (the browser
 * sends it), low volume and caching (the browser caches tiles): fine for one person looking at one city.
 */
export const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

export type MapPoint = { readonly lat: number; readonly lng: number; readonly precisionM?: number };

/** A pin within this many metres reads as exact: no precision ring. */
export const PRECISE_M = 30;

export const isPrecise = (point: MapPoint): boolean => (point.precisionM ?? 0) <= PRECISE_M;

export const osmLink = (point: MapPoint): string => {
  const lat = point.lat.toFixed(6);
  const lng = point.lng.toFixed(6);
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
};

export const googleLink = (point: MapPoint): string =>
  `https://www.google.com/maps/search/?api=1&query=${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;

/** The coordinates line under the address: `52.19060, 21.01290 · placed to about 250 m`. */
export const coordinatesLine = (point: MapPoint): string =>
  `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}${isPrecise(point) ? '' : ` · placed to about ${Math.round(point.precisionM ?? 0)} m`}`;
