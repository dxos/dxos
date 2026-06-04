//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';
import { Routing } from '@dxos/plugin-trip';

import { type OsrmResponse } from './osrm-mapping';

const DEFAULT_BASE_URL = 'https://router.project-osrm.org';

export type OsrmClientOptions = {
  fetch?: typeof globalThis.fetch;
  baseUrl?: string;
};

/**
 * Requests a driving route through an ordered list of `[lon, lat]` coordinates from an OSRM server.
 * Returns the raw response (parsed by `parseRoute`); throws `RouteError` on an HTTP failure.
 */
export const fetchRoute = async (
  coordinates: ReadonlyArray<readonly number[]>,
  options: OsrmClientOptions = {},
): Promise<OsrmResponse> => {
  const fetchFn = options.fetch ?? globalThis.fetch;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const path = coordinates.map(([lon, lat]) => `${lon},${lat}`).join(';');
  const url = `${baseUrl}/route/v1/driving/${path}?overview=full&geometries=geojson&steps=true`;

  log('osrm route request', { url, waypoints: coordinates.length });
  const response = await fetchFn(url);
  log('osrm route response', { status: response.status, ok: response.ok });
  if (!response.ok) {
    throw new Routing.RouteError(`OSRM request failed: ${response.status}`);
  }

  // External, untyped JSON — asserted to the documented OSRM shape at this boundary.
  return (await response.json()) as OsrmResponse;
};
