//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Place, Routing } from '@dxos/plugin-trip';

import { makeOsrmRoutingService } from './OsrmRoutingService';

const GEO: Record<string, [number, number]> = {
  London: [-0.1276, 51.5074],
  Avignon: [4.8055, 43.9493],
  Barcelona: [2.1734, 41.3851],
};

const nominatimResponse = (name: string) => {
  const geo = GEO[name];
  return geo ? [{ name, lon: String(geo[0]), lat: String(geo[1]), address: { country_code: 'xx' } }] : [];
};

const osrmRouteResponse = (coordinateCount: number) => ({
  code: 'Ok',
  routes: [
    {
      distance: 1000 * (coordinateCount - 1),
      duration: 600 * (coordinateCount - 1),
      legs: Array.from({ length: coordinateCount - 1 }, (_, index) => ({
        distance: 1000,
        duration: 600,
        steps: [
          {
            geometry: {
              coordinates: [
                [index, index],
                [index + 1, index + 1],
              ],
            },
          },
        ],
      })),
    },
  ],
});

/** Routes requests by URL to canned Nominatim / OSRM responses. Cast at the test boundary. */
const mockFetch = (): typeof globalThis.fetch =>
  (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/search')) {
      const query = decodeURIComponent(new URL(url).searchParams.get('q') ?? '');
      return new Response(JSON.stringify(nominatimResponse(query)), { status: 200 });
    }
    if (url.includes('/route/')) {
      const coords = url.split('/route/v1/driving/')[1].split('?')[0].split(';');
      return new Response(JSON.stringify(osrmRouteResponse(coords.length)), { status: 200 });
    }
    return new Response('not found', { status: 404 });
  }) as typeof globalThis.fetch;

describe('OsrmRoutingService', () => {
  test('geocodes string waypoints and returns a leg per consecutive pair', async ({ expect }) => {
    const service = makeOsrmRoutingService({ fetch: mockFetch(), geocodeDelayMs: 0 });
    const result = await service.route({ waypoints: ['London', 'Avignon', 'Barcelona'] });
    expect(result.legs).toHaveLength(2);
    expect(result.legs[0].origin.name).toBe('London');
    expect(result.legs[0].origin.geo).toEqual([-0.1276, 51.5074]);
    expect(result.legs[1].destination.name).toBe('Barcelona');
    expect(result.distanceMeters).toBe(2000);
  });

  test('passes through already-resolved Places without geocoding', async ({ expect }) => {
    const places: Place.Place[] = [
      { name: 'A', geo: [0, 0] },
      { name: 'B', geo: [1, 1] },
    ];
    const service = makeOsrmRoutingService({ fetch: mockFetch(), geocodeDelayMs: 0 });
    const result = await service.route({ waypoints: places });
    expect(result.legs).toHaveLength(1);
    expect(result.legs[0].origin.name).toBe('A');
  });

  test('throws GeocodeError for an unknown place name', async ({ expect }) => {
    const service = makeOsrmRoutingService({ fetch: mockFetch(), geocodeDelayMs: 0 });
    await expect(service.route({ waypoints: ['London', 'Atlantis'] })).rejects.toThrow(Routing.GeocodeError);
  });
});
