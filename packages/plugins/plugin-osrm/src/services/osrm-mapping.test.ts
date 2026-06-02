//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Routing } from '@dxos/plugin-trip';

import { type NominatimResult, type OsrmResponse, parsePlace, parseRoute } from './osrm-mapping';

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

const place = (name: string, geo: [number, number]) => ({ name, geo });

describe('parseRoute', () => {
  test('maps OSRM legs to RouteLegs paired with consecutive places', ({ expect }) => {
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
              steps: [
                {
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
    const places = [place('A', [0, 0]), place('B', [1, 1]), place('C', [2, 2])];

    const result = parseRoute(response, places);
    expect(result.legs).toHaveLength(2);
    expect(result.distanceMeters).toBe(1000);
    expect(result.durationSeconds).toBe(600);
    expect(result.legs[0].origin.name).toBe('A');
    expect(result.legs[0].destination.name).toBe('B');
    expect(result.legs[0].path).toEqual([
      [0, 0],
      [1, 1],
    ]);
    expect(result.legs[1].path).toEqual([
      [1, 1],
      [2, 2],
    ]);
  });

  test('falls back to leg endpoints when no step geometry is present', ({ expect }) => {
    const response: OsrmResponse = {
      code: 'Ok',
      routes: [{ distance: 100, duration: 60, legs: [{ distance: 100, duration: 60 }] }],
    };
    const result = parseRoute(response, [place('A', [0, 0]), place('B', [3, 4])]);
    expect(result.legs[0].path).toEqual([
      [0, 0],
      [3, 4],
    ]);
  });

  test('throws RouteError when the response is not Ok', ({ expect }) => {
    expect(() => parseRoute({ code: 'NoRoute', message: 'no route' }, [])).toThrow(Routing.RouteError);
  });
});
