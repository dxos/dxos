//
// Copyright 2026 DXOS.org
//

import { type Place, Routing } from '@dxos/plugin-trip/types';

//
// Nominatim (geocoding) response → Place.
//

export type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  country?: string;
  country_code?: string;
};

export type NominatimResult = {
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
  address?: NominatimAddress;
};

/** Maps the first Nominatim result to a `Place`; returns undefined when empty / unparseable. */
export const parsePlace = (results: readonly NominatimResult[], query: string): Place.Place | undefined => {
  const first = results[0];
  if (!first) {
    return undefined;
  }
  const lon = Number.parseFloat(first.lon);
  const lat = Number.parseFloat(first.lat);
  if (Number.isNaN(lon) || Number.isNaN(lat)) {
    return undefined;
  }
  const city = first.address?.city ?? first.address?.town ?? first.address?.village;
  const name = first.name ?? first.display_name?.split(',')[0]?.trim() ?? query;
  return {
    name,
    city,
    country: first.address?.country_code?.toUpperCase(),
    geo: [lon, lat],
  };
};

//
// OSRM (routing) response → Route[].
//

export type OsrmStep = { name?: string; ref?: string; geometry?: { coordinates?: Array<[number, number]> } };
export type OsrmLeg = { distance?: number; duration?: number; summary?: string; steps?: OsrmStep[] };
export type OsrmRoute = { distance?: number; duration?: number; legs?: OsrmLeg[] };
export type OsrmResponse = { code?: string; message?: string; routes?: OsrmRoute[] };

const mapLeg = (osrmLeg: OsrmLeg): Routing.RouteLeg => ({
  distance: osrmLeg.distance ?? 0,
  duration: osrmLeg.duration ?? 0,
  summary: osrmLeg.summary || undefined,
  // Per-leg geometry is the concatenation of its steps' geometries.
  geometry: (osrmLeg.steps ?? []).flatMap((step) => step.geometry?.coordinates ?? []),
  steps: (osrmLeg.steps ?? []).map((step) => ({ name: step.name || undefined, ref: step.ref || undefined })),
});

/**
 * Maps an OSRM `/route` response into the route alternatives. Each route's totals and geometry are
 * derived from its legs (via `Routing.makeRoute`). Throws `RouteError` when the response is not `Ok`.
 */
export const parseRoutes = (response: OsrmResponse): Routing.Route[] => {
  if (response.code !== 'Ok' || !response.routes || response.routes.length === 0) {
    throw new Routing.RouteError(`OSRM routing failed: ${response.message ?? response.code ?? 'unknown error'}`);
  }

  return response.routes.map((route) => Routing.makeRoute((route.legs ?? []).map(mapLeg)));
};
