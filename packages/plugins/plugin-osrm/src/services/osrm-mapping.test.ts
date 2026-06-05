//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Routing } from '@dxos/plugin-trip/types';

import { type NominatimResult, type OsrmResponse, parsePlace, parseRoutes } from './osrm-mapping';

const PARIS: NominatimResult = {
  lat: '48.8534951',
  lon: '2.3483915',
  name: 'Paris',
  display_name: 'Paris, Île-de-France, France',
  address: { city: 'Paris', country: 'France', country_code: 'fr' },
};

describe('parsePlace', () => {
  test('maps the first result to a Place with [lon, lat] geo', ({ expect }) => {
    const place = parsePlace([PARIS], 'Paris');
    expect(place?.name).toBe('Paris');
    expect(place?.city).toBe('Paris');
    expect(place?.country).toBe('FR');
    expect(place?.geo).toEqual([2.3483915, 48.8534951]);
  });

  test('returns undefined for an empty result set', ({ expect }) => {
    expect(parsePlace([], 'Nowhere')).toBeUndefined();
  });

  test('falls back to the query name when the result has no name', ({ expect }) => {
    const place = parsePlace([{ lat: '1', lon: '2' }], 'Somewhere');
    expect(place?.name).toBe('Somewhere');
    expect(place?.geo).toEqual([2, 1]);
  });
});

describe('parseRoutes', () => {
  test('maps OSRM legs into a Route with totals and concatenated geometry', ({ expect }) => {
    const response: OsrmResponse = {
      code: 'Ok',
      routes: [
        {
          distance: 1000,
          duration: 600,
          legs: [
            {
              distance: 400,
              duration: 240,
              summary: 'A Road',
              steps: [
                {
                  name: 'High St',
                  ref: 'A1',
                  geometry: {
                    coordinates: [
                      [0, 0],
                      [1, 1],
                    ],
                  },
                },
              ],
            },
            {
              distance: 600,
              duration: 360,
              steps: [
                {
                  name: 'Main St',
                  geometry: {
                    coordinates: [
                      [1, 1],
                      [2, 2],
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const routes = parseRoutes(response);
    expect(routes).toHaveLength(1);
    const route = routes[0];
    expect(route.legs).toHaveLength(2);
    // Totals derived from the legs; geometry is the concatenation of the legs' geometry.
    expect(route.distance).toBe(1000);
    expect(route.duration).toBe(600);
    expect(Routing.routeGeometry(route)).toEqual([
      [0, 0],
      [1, 1],
      [1, 1],
      [2, 2],
    ]);
    expect(route.legs[0].summary).toBe('A Road');
    expect(route.legs[0].geometry).toEqual([
      [0, 0],
      [1, 1],
    ]);
    expect(route.legs[0].steps[0]).toEqual({ name: 'High St', ref: 'A1' });
    expect(route.legs[1].steps[0]).toEqual({ name: 'Main St', ref: undefined });
  });

  test('throws RouteError when the response is not Ok', ({ expect }) => {
    expect(() => parseRoutes({ code: 'NoRoute', message: 'no route' })).toThrow(Routing.RouteError);
  });
});
