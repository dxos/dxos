//
// Copyright 2026 DXOS.org
//

import { type Place, Routing } from '@dxos/plugin-trip/types';

import { type NominatimResult, parsePlace } from './osrm-mapping';

const DEFAULT_BASE_URL = 'https://nominatim.openstreetmap.org';

// Nominatim's usage policy asks for a descriptive User-Agent. Browsers forbid setting it (it is sent
// automatically), so this only takes effect in non-browser callers (e.g. tests / node).
const USER_AGENT = 'DXOS Composer plugin-osrm (https://dxos.org)';

export type NominatimClientOptions = {
  fetch?: typeof globalThis.fetch;
  baseUrl?: string;
};

/**
 * Geocodes a free-text place name to a `Place` (with `geo`) via Nominatim. Returns undefined when
 * there is no match; throws `GeocodeError` on a transport / HTTP failure.
 */
export const geocode = async (
  query: string,
  options: NominatimClientOptions = {},
): Promise<Place.Place | undefined> => {
  const fetchFn = options.fetch ?? globalThis.fetch;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const url = `${baseUrl}/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=1&addressdetails=1`;

  let response: Response;
  try {
    response = await fetchFn(url, { headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' } });
  } catch {
    // Wrap transport failures (DNS / timeout / network) so callers always see a GeocodeError.
    throw new Routing.GeocodeError(query);
  }
  if (!response.ok) {
    throw new Routing.GeocodeError(query);
  }

  // External, untyped JSON — asserted to the documented Nominatim shape at this boundary.
  const results = (await response.json()) as NominatimResult[];
  return parsePlace(results, query);
};
