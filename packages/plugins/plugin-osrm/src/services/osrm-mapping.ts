//
// Copyright 2026 DXOS.org
//

import { type Place, Routing } from '@dxos/plugin-trip';

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
// OSRM (routing) response → RouteResult.
//

export type OsrmStep = { geometry?: { coordinates?: Array<[number, number]> } };
export type OsrmLeg = { distance?: number; duration?: number; steps?: OsrmStep[] };
export type OsrmRoute = { distance?: number; duration?: number; legs?: OsrmLeg[] };
export type OsrmResponse = { code?: string; message?: string; routes?: OsrmRoute[] };

/**
 * Maps an OSRM `/route` response into a `RouteResult`, pairing each OSRM leg with the corresponding
 * consecutive `places` (the geocoded waypoints). Per-leg geometry is the concatenation of the leg's
 * step geometries; falls back to the leg endpoints when steps are absent. Throws `RouteError` when
 * the response is not `Ok`.
 */
export const parseRoute = (response: OsrmResponse, places: readonly Place.Place[]): Routing.RouteResult => {
  if (response.code !== 'Ok' || !response.routes || response.routes.length === 0) {
    throw new Routing.RouteError(`OSRM routing failed: ${response.message ?? response.code ?? 'unknown error'}`);
  }

  const route = response.routes[0];
  const osrmLegs = route.legs ?? [];
  const legs: Routing.RouteLeg[] = [];
  for (let index = 0; index < osrmLegs.length; index++) {
    const origin = places[index];
    const destination = places[index + 1];
    if (!origin || !destination) {
      continue;
    }
    const osrmLeg = osrmLegs[index];
    const stepCoords = (osrmLeg.steps ?? []).flatMap((step) => step.geometry?.coordinates ?? []);
    const fallback = [origin.geo, destination.geo].filter((point): point is NonNullable<typeof point> => point != null);
    legs.push({
      origin,
      destination,
      distanceMeters: osrmLeg.distance ?? 0,
      durationSeconds: osrmLeg.duration ?? 0,
      path: stepCoords.length > 0 ? stepCoords : fallback,
    });
  }

  return {
    legs,
    distanceMeters: route.distance ?? legs.reduce((sum, leg) => sum + leg.distanceMeters, 0),
    durationSeconds: route.duration ?? legs.reduce((sum, leg) => sum + leg.durationSeconds, 0),
  };
};
