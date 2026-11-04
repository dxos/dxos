//
// Copyright 2026 DXOS.org
//

// Ported from lighthouse `src/geo/location.ts` (github.com/dmaretskyi/lighthouse): the one reader of a subject's
// coordinates, so cards, the map and the rating model place a result the same way lighthouse does. Lighthouse is
// migrating extractors to a canonical location shape; read coordinates only through this module.
//
// A subject carries at most two points, both flat on the subject:
// - the placed point, `geo:lat` / `geo:long`, written by `lighthouse geocode`, with its radius in
//   `lh:locationUncertaintyM`; it is lighthouse's best estimate, so it wins;
// - the stated point, `schema:latitude` / `schema:longitude`, as the page gives it, with its radius in
//   `lh:locationPrecisionM` (legacy otodom facts: `lh:mapRadiusM`).

export interface Location {
  readonly lat: number;
  readonly lng: number;
  /** Radius in metres within which the subject lies; absent when the source does not say. */
  readonly precisionM?: number;
}

type Value = string | number | boolean;

export interface Locatable {
  readonly types: ReadonlyArray<string>;
  readonly props: Readonly<Record<string, ReadonlyArray<Value>>>;
}

const toNumber = (value: Value | undefined): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.trim().replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

/** A WGS84 point in range, and not the 0,0 a missing value often decodes to. */
export const validPoint = (lat: number | undefined, lng: number | undefined): boolean =>
  lat !== undefined && lng !== undefined && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

const point = (
  entity: Locatable,
  latKey: string,
  lngKey: string,
  precisionKeys: ReadonlyArray<string>,
): Location | undefined => {
  const lat = toNumber(entity.props[latKey]?.[0]);
  const lng = toNumber(entity.props[lngKey]?.[0]);
  if (lat === undefined || lng === undefined || !validPoint(lat, lng)) {
    return undefined;
  }
  for (const key of precisionKeys) {
    const precision = toNumber(entity.props[key]?.[0]);
    // otodom's lh:mapRadiusM is 0 for an exact pin, so 0 means "exact" there and is kept as 0.
    if (precision !== undefined && precision >= 0) {
      return { lat, lng, precisionM: precision };
    }
  }
  return { lat, lng };
};

/** The point the subject's source states (schema:latitude / schema:longitude), ignoring the geocoder's estimate. */
export const statedLocationOf = (entity: Locatable): Location | undefined =>
  point(entity, 'schema:latitude', 'schema:longitude', ['lh:locationPrecisionM', 'lh:mapRadiusM']);

/** The subject's best known point: the geocoder's placed point, else the point its source states. */
export const locationOf = (entity: Locatable): Location | undefined =>
  point(entity, 'geo:lat', 'geo:long', ['lh:locationUncertaintyM']) ?? statedLocationOf(entity);

/** Great-circle distance in metres (haversine). */
export const distanceMetres = (
  a: { readonly lat: number; readonly lng: number },
  b: { readonly lat: number; readonly lng: number },
): number => {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_008.8 * Math.asin(Math.min(1, Math.sqrt(h)));
};

/** Whether a point lies inside a polygon ring (ray casting on lat/lng, fine at city scale). */
export const insidePolygon = (
  p: { readonly lat: number; readonly lng: number },
  ring: ReadonlyArray<{ readonly lat: number; readonly lng: number }>,
): boolean => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (
      a &&
      b &&
      a.lat > p.lat !== b.lat > p.lat &&
      p.lng < ((b.lng - a.lng) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lng
    ) {
      inside = !inside;
    }
  }
  return inside;
};
