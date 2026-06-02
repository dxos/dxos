//
// Copyright 2026 DXOS.org
//

import { type Place, Routing } from '@dxos/plugin-trip';

import { geocode } from './NominatimClient';
import { parseRoute } from './osrm-mapping';
import { fetchRoute } from './OsrmClient';

export const OSRM_SERVICE_ID = 'osrm';

/** Default delay (ms) between Nominatim geocode calls, to respect its ≤ 1 req/s policy. */
const DEFAULT_GEOCODE_DELAY_MS = 1_100;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export type OsrmServiceOptions = {
  /** Injectable fetch (tests / custom transport). */
  fetch?: typeof globalThis.fetch;
  /** Override the Nominatim base URL. */
  nominatimBaseUrl?: string;
  /** Override the OSRM base URL. */
  osrmBaseUrl?: string;
  /** Delay (ms) between consecutive geocode calls. */
  geocodeDelayMs?: number;
};

/**
 * Builds the OSRM `RoutingService`: geocodes any name-only waypoints via Nominatim (throttled),
 * passes through already-resolved Places, then computes a single driving route through all
 * coordinates via OSRM and splits it into per-leg distance / duration / path.
 */
export const makeOsrmRoutingService = (options: OsrmServiceOptions = {}): Routing.RoutingService => ({
  id: OSRM_SERVICE_ID,
  label: 'OSRM (OpenStreetMap)',
  profiles: ['driving'],
  route: async ({ waypoints }) => {
    const places: Place.Place[] = [];
    let geocodeCount = 0;
    for (const waypoint of waypoints) {
      if (typeof waypoint !== 'string') {
        places.push(waypoint);
        continue;
      }
      if (geocodeCount > 0) {
        await delay(options.geocodeDelayMs ?? DEFAULT_GEOCODE_DELAY_MS);
      }
      geocodeCount++;
      const place = await geocode(waypoint, { fetch: options.fetch, baseUrl: options.nominatimBaseUrl });
      if (!place) {
        throw new Routing.GeocodeError(waypoint);
      }
      places.push(place);
    }

    const coordinates = places
      .map((place) => place.geo)
      .filter((geo): geo is NonNullable<typeof geo> => geo != null)
      // Drop the optional altitude so the `[lon, lat]` tuple is a plain number[] for the URL builder.
      .map((geo) => [geo[0], geo[1]]);
    if (coordinates.length < 2) {
      throw new Routing.RouteError('At least two located waypoints are required to plan a route.');
    }

    const response = await fetchRoute(coordinates, { fetch: options.fetch, baseUrl: options.osrmBaseUrl });
    return parseRoute(response, places);
  },
});
