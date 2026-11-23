//
// Copyright 2026 DXOS.org
//

// Ported from lighthouse `src/agent/rating.test.ts` ("geo areas") and `src/geo/location.test.ts`, so Composer ranks
// located results exactly like the web UI.

import { describe, test } from 'vitest';

import { distanceMetres, insidePolygon, locationOf } from './location.ts';
import {
  AREA_TERM,
  type AreaOverride,
  DEFAULT_SOFT_M,
  type Rateable,
  type RatingModel,
  applyOverrides,
  areaFit,
  cleanAreas,
  haversineM,
  rateAll,
  signedDistanceM,
  withLinkedGeo,
} from './rating.ts';

// Warsaw: a circle of 500 m around Metro Wierzbno, and a square over Stary Mokotów.
const WIERZBNO: readonly [number, number] = [21.0129, 52.1906];
const SQUARE = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [21.0, 52.2],
      [21.02, 52.2],
      [21.02, 52.21],
      [21.0, 52.21],
      [21.0, 52.2],
    ] as Array<[number, number]>,
  ],
};

const flat = (id: string, lat?: number, lng?: number): Rateable => ({
  id,
  types: ['lh:RentalListing'],
  props: {
    'lh:monthlyPrice': [4000],
    ...(lat !== undefined && lng !== undefined ? { 'schema:latitude': [lat], 'schema:longitude': [lng] } : {}),
  },
});

const priced: RatingModel = {
  version: 1,
  rationale: 'test',
  terms: [{ id: 'price', label: 'price', weight: 2, value: { prop: 'lh:monthlyPrice' }, shape: 'lower' }],
};

describe('locationOf', () => {
  test("prefers the geocoder's placed point over the stated one", ({ expect }) => {
    const entity = {
      types: [],
      props: {
        'geo:lat': [52.2],
        'geo:long': [21.0],
        'lh:locationUncertaintyM': [40],
        'schema:latitude': [52.3],
        'schema:longitude': [21.1],
      },
    };
    expect(locationOf(entity)).toEqual({ lat: 52.2, lng: 21.0, precisionM: 40 });
  });

  test('reads the stated point with its precision, legacy otodom radius and string values', ({ expect }) => {
    expect(
      locationOf({
        types: [],
        props: { 'schema:latitude': ['52.25'], 'schema:longitude': ['21,01'], 'lh:locationPrecisionM': [150] },
      }),
    ).toEqual({ lat: 52.25, lng: 21.01, precisionM: 150 });
    expect(
      locationOf({
        types: [],
        props: { 'schema:latitude': [52.25], 'schema:longitude': [21.01], 'lh:mapRadiusM': [0] },
      }),
    ).toEqual({ lat: 52.25, lng: 21.01, precisionM: 0 });
  });

  test('rejects half points, 0,0 and out-of-range values', ({ expect }) => {
    expect(locationOf({ types: [], props: { 'schema:latitude': [52.25] } })).toBeUndefined();
    expect(locationOf({ types: [], props: { 'schema:latitude': [0], 'schema:longitude': [0] } })).toBeUndefined();
    expect(locationOf({ types: [], props: { 'schema:latitude': [120], 'schema:longitude': [21] } })).toBeUndefined();
  });

  test('measures and tests polygons', ({ expect }) => {
    expect(Math.round(distanceMetres({ lat: 52.2297, lng: 21.0122 }, { lat: 52.4064, lng: 16.9252 }) / 1000)).toBe(278);
    const square = [
      { lat: 52, lng: 21 },
      { lat: 52, lng: 22 },
      { lat: 53, lng: 22 },
      { lat: 53, lng: 21 },
    ];
    expect(insidePolygon({ lat: 52.5, lng: 21.5 }, square)).toBe(true);
    expect(insidePolygon({ lat: 54, lng: 21.5 }, square)).toBe(false);
  });
});

describe('geo areas', () => {
  test('measures signed distance to a circle and a polygon', ({ expect }) => {
    expect(signedDistanceM(WIERZBNO, { type: 'Circle', center: WIERZBNO, radiusM: 500 })).toBeCloseTo(-500, 0);
    // 0.01° of latitude is about 1112 m: a point 0.005° north of the square's top edge is ~556 m out.
    expect(signedDistanceM([21.01, 52.215], SQUARE)).toBeCloseTo(556, -1);
    expect(signedDistanceM([21.01, 52.205], SQUARE)).toBeCloseTo(-556, -1);
    expect(haversineM([21.0, 52.2], [21.0, 52.21])).toBeCloseTo(1112, -1);
  });

  test("scores the fit with a soft edge, and counts a pin's precision against it", ({ expect }) => {
    const area = {
      id: 'a',
      label: 'Wierzbno',
      shape: { type: 'Circle' as const, center: WIERZBNO, radiusM: 500 },
      softM: 400,
    };
    // 700 m north of the station: 200 m outside, half-way across the 400 m soft edge.
    expect(areaFit({ lat: WIERZBNO[1] + 700 / 111_195, lng: WIERZBNO[0] }, area)).toBeCloseTo(0.5, 2);
    expect(areaFit({ lat: WIERZBNO[1], lng: WIERZBNO[0] }, area)).toBe(1);
    // 100 m inside the edge, but only placed to 300 m: 200 m out.
    expect(areaFit({ lat: WIERZBNO[1] + 400 / 111_195, lng: WIERZBNO[0], precisionM: 300 }, area)).toBeCloseTo(0.5, 2);
    expect(areaFit({ lat: WIERZBNO[1] + 0.02, lng: WIERZBNO[0] }, area)).toBe(0);
  });

  test('turns preferred areas into one union term and required areas into a requirement', ({ expect }) => {
    const areas: AreaOverride[] = [
      {
        id: 'w',
        label: 'Near Wierzbno',
        shape: { type: 'Circle', center: WIERZBNO, radiusM: 500 },
        mode: 'prefer',
        softM: 0,
      },
      { id: 's', label: 'Stary Mokotów', shape: SQUARE, mode: 'prefer', softM: 0 },
    ];
    const model = applyOverrides(priced, { areas });
    const term = model.terms.find((term) => term.id === AREA_TERM);
    expect(term?.weight).toBe(2);
    expect(term?.label).toBe('In “Near Wierzbno” or “Stary Mokotów”');
    const results = [
      flat('station', WIERZBNO[1], WIERZBNO[0]),
      flat('square', 52.205, 21.01),
      flat('far', 52.25, 20.95),
      flat('unknown'),
    ];
    const ratings = rateAll(model, results);
    expect(ratings.get('station')?.score).toBe(1);
    expect(ratings.get('square')?.score).toBe(1);
    expect(ratings.get('far')?.score).toBe(0.5);
    expect(ratings.get('unknown')?.score).toBe(0.5);

    const [first] = areas;
    const required = applyOverrides(priced, { areas: first ? [{ ...first, mode: 'require', softM: 300 }] : [] });
    expect(required.terms.some((term) => term.id === AREA_TERM)).toBe(false);
    const penalised = rateAll({ ...required, penalty: 0.5 }, results);
    expect(penalised.get('station')?.missed).toEqual([]);
    expect(penalised.get('far')?.missed).toEqual(['Inside “Near Wierzbno”']);
    expect(penalised.get('unknown')?.missed).toHaveLength(1);
    expect(penalised.get('far')?.score).toBe(0.5);
  });

  test("takes a person's weight for the area term and keeps the agent's terms", ({ expect }) => {
    const areas: AreaOverride[] = [
      { id: 'w', label: 'W', shape: { type: 'Circle', center: WIERZBNO, radiusM: 500 }, mode: 'prefer' },
    ];
    const model = applyOverrides(priced, { areas, terms: { [AREA_TERM]: { weight: 5 } } });
    expect(model.terms.map((term) => [term.id, term.weight])).toEqual([
      ['price', 2],
      [AREA_TERM, 5],
    ]);
    expect(applyOverrides(priced, { areas, terms: { [AREA_TERM]: { off: true } } }).terms).toHaveLength(1);
  });

  test('reads coordinates from a linked schema:geo node', ({ expect }) => {
    const geo: Rateable = {
      id: 'g',
      types: ['schema:GeoCoordinates'],
      props: { 'schema:latitude': [52.2], 'schema:longitude': [21.0] },
    };
    const listing: Rateable = { id: 'l', types: ['lh:RentalListing'], props: { 'schema:geo': ['g'] } };
    const [out] = withLinkedGeo([listing], [listing, geo]);
    expect(out && locationOf(out)).toEqual({ lat: 52.2, lng: 21.0 });
    expect(locationOf(listing)).toBeUndefined();
  });

  test('cleans drawn areas and rejects broken ones', ({ expect }) => {
    const clean = cleanAreas([
      { id: 'a', label: '  Mokotów ', shape: SQUARE, mode: 'require' },
      { id: 'b', label: 'bad', shape: { type: 'Circle', center: [200, 52], radiusM: 10 } },
      {
        id: 'c',
        label: 'tiny',
        shape: {
          type: 'Polygon',
          coordinates: [
            [
              [21, 52],
              [21.1, 52],
            ],
          ],
        },
      },
      { id: 'd', label: '', shape: { type: 'Circle', center: WIERZBNO, radiusM: 800 }, softM: 99999 },
    ]);
    expect(clean.map((area) => [area.id, area.label, area.mode, area.softM])).toEqual([
      ['a', 'Mokotów', 'require', DEFAULT_SOFT_M],
      ['d', 'Area', 'prefer', 5000],
    ]);
  });
});
