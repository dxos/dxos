//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from 'vitest';

import { type Rateable, type RatingModel } from './rating.ts';
import {
  type ResultsView,
  applyView,
  cleanView,
  deriveFacets,
  describeFilter,
  describeSort,
  facetCounts,
  filterFor,
  sortResults,
} from './view.ts';

const NOW = Date.parse('2026-10-29T12:00:00Z');
const flat = (
  id: string,
  props: Record<string, Array<string | number | boolean>>,
  types = ['lh:RentalListing'],
): Rateable => ({ id, types, props: { 'schema:name': [id], ...props } });

const flats: Rateable[] = [
  flat('a', {
    'lh:monthlyPrice': [4000],
    'lh:adminFee': [800],
    'lh:areaM2': [48],
    'schema:numberOfRooms': [2],
    'lh:district': ['Wola'],
    'lh:amenity': ['balcony', 'lift'],
    'schema:datePosted': ['2026-10-27T10:00:00Z'],
    'schema:latitude': [52.23],
    'schema:longitude': [20.98],
    'schema:image': ['https://x/a.jpg'],
  }),
  flat('b', {
    'lh:monthlyPrice': [5500],
    'lh:adminFee': [900],
    'lh:areaM2': [62],
    'schema:numberOfRooms': [3],
    'lh:district': ['Mokotów'],
    'lh:amenity': ['lift'],
    'schema:datePosted': ['2026-09-01T10:00:00Z'],
  }),
  flat('c', {
    'lh:monthlyPrice': [3200],
    'lh:areaM2': [35],
    'schema:numberOfRooms': [1],
    'lh:district': ['Wola'],
    'schema:datePosted': ['2026-10-28T10:00:00Z'],
    'schema:image': ['https://x/c.jpg'],
  }),
  flat('d', {
    'lh:monthlyPrice': [5200],
    'lh:adminFee': [700],
    'lh:areaM2': [70],
    'schema:numberOfRooms': [2],
    'lh:district': ['Śródmieście'],
    'lh:amenity': ['balcony'],
  }),
  // A metro station: never has a rent, so a rent filter does not apply to it.
  flat('metro', { 'lh:district': ['Mokotów'], 'lh:category': ['Stacja metra'], 'schema:ratingValue': [4.5] }, [
    'schema:LocalBusiness',
  ]),
];

const model: RatingModel = {
  version: 1,
  rationale: 'test',
  terms: [
    {
      id: 'total',
      label: 'Total monthly cost (rent + czynsz)',
      weight: 3,
      value: { sum: ['lh:monthlyPrice', 'lh:adminFee'] },
      shape: 'lower',
    },
    {
      id: 'balcony',
      label: 'Has a balcony',
      weight: 2,
      value: { has: 'lh:amenity', equals: 'balcony' },
      shape: 'flag',
    },
    { id: 'area', label: 'Floor area (m²)', weight: 1, value: { prop: 'lh:areaM2' }, shape: 'higher' },
  ],
};
const ratings = new Map(
  [
    ['a', 0.9],
    ['b', 0.5],
    ['c', 0.7],
    ['d', 0.6],
    ['metro', 0],
  ].map(([id, score]) => [id as string, { score: score as number }]),
);
const ids = (rs: ReadonlyArray<Rateable>) => rs.map((r) => r.id);

describe('deriving filters from the results', () => {
  const facets = deriveFacets(flats, model, NOW);
  const byId = new Map(facets.map((f) => [f.id, f]));

  it('makes ranges of numbers and of the sums the model reads, named as the model names them', () => {
    const total = byId.get('sum:lh:monthlyPrice+lh:adminFee')!;
    expect(total).toMatchObject({
      kind: 'range',
      label: 'Total monthly cost (rent + czynsz)',
      min: 3200,
      max: 6400,
      inModel: true,
      integer: true,
    });
    expect(byId.get('lh:areaM2')).toMatchObject({ kind: 'range', label: 'Floor area (m²)' });
    expect(byId.get('schema:numberOfRooms')).toMatchObject({ kind: 'range', label: 'Rooms' });
  });

  it("makes checkbox lists of repeated texts, toggles of the model's flags, and dates", () => {
    expect(byId.get('lh:district')).toMatchObject({ kind: 'values', label: 'District' });
    expect(byId.get('lh:district')!.options!.map((o) => [o.label, o.count])).toEqual([
      ['Mokotów', 2],
      ['Wola', 2],
      ['Śródmieście', 1],
    ]);
    expect(byId.get('lh:amenity')).toMatchObject({ kind: 'values', multi: true });
    expect(byId.get('is:lh:amenity=balcony')).toMatchObject({ kind: 'flag', label: 'Has a balcony' });
    expect(byId.get('photos')).toMatchObject({ kind: 'flag', label: 'Has photos' });
    expect(byId.get('located')).toMatchObject({ kind: 'flag', label: 'Has a location' });
    expect(byId.get('date:schema:datePosted')).toMatchObject({ kind: 'date', label: 'Posted' });
    expect(byId.get('rdf:type')).toMatchObject({ kind: 'values', label: 'Kind' });
    expect(byId.has('schema:name')).toBe(false);
  });

  it('ranks what the model reads first and marks the first 10 primary', () => {
    expect(facets.slice(0, 3).every((f) => f.inModel)).toBe(true);
    expect(facets.filter((f) => f.primary).length).toBe(Math.min(10, facets.length));
  });
});

describe('applying the view', () => {
  const total = {
    id: 'sum:lh:monthlyPrice+lh:adminFee',
    label: 'Total monthly cost',
    kind: 'range' as const,
    value: { sum: ['lh:monthlyPrice', 'lh:adminFee'] },
    max: 6000,
  };

  it('cuts by every active filter; a result of a kind that never has the value is not applicable', () => {
    const { results } = applyView(flats, { filters: [total] }, { ratings, now: NOW });
    // b is 6400; the metro station has no rent and no listing-like kind.
    expect(ids(results)).toEqual(['a', 'c', 'd']);
  });

  it('keeps unknowns by default and counts them; excludes them when asked', () => {
    const balcony = {
      id: 'is:lh:amenity=balcony',
      label: 'Has a balcony',
      kind: 'flag' as const,
      test: { has: 'lh:amenity', equals: 'balcony' },
    };
    const keep = applyView(flats, { filters: [balcony] }, { ratings, now: NOW });
    expect(ids(keep.results)).toEqual(['a', 'c', 'd']);
    expect(keep.unknown.get(balcony.id)).toBe(1);
    expect(ids(applyView(flats, { filters: [{ ...balcony, includeMissing: false }] }, { ratings }).results)).toEqual([
      'a',
      'd',
    ]);
  });

  it('reads checkbox lists as any-of, or all-of for several values', () => {
    expect(
      ids(
        applyView(
          flats,
          {
            filters: [
              {
                id: 'lh:district',
                label: 'District',
                kind: 'values',
                prop: 'lh:district',
                values: ['wola', 'Śródmieście'],
              },
            ],
          },
          { ratings },
        ).results,
      ),
    ).toEqual(['a', 'c', 'd']);
    const all = {
      id: 'lh:amenity',
      label: 'Amenities',
      kind: 'values' as const,
      prop: 'lh:amenity',
      values: ['balcony', 'lift'],
      all: true,
      includeMissing: false,
    };
    expect(ids(applyView(flats, { filters: [all] }, { ratings }).results)).toEqual(['a']);
  });

  it('filters dates to the last N days and ranges with a min', () => {
    const recent = {
      id: 'date:schema:datePosted',
      label: 'Posted',
      kind: 'date' as const,
      prop: 'schema:datePosted',
      days: 7,
      includeMissing: false,
    };
    expect(ids(applyView(flats, { filters: [recent] }, { ratings, now: NOW }).results)).toEqual(['a', 'c']);
    const rooms = {
      id: 'schema:numberOfRooms',
      label: 'Rooms',
      kind: 'range' as const,
      value: { prop: 'schema:numberOfRooms' },
      min: 2,
    };
    expect(ids(applyView(flats, { filters: [rooms, total] }, { ratings }).results)).toEqual(['a', 'd']);
  });

  it('an empty list or an open range cuts nothing', () => {
    const view: ResultsView = {
      filters: [
        { id: 'lh:district', label: 'District', kind: 'values', prop: 'lh:district', values: [] },
        { ...total, max: undefined },
      ],
    };
    expect(applyView(flats, view, { ratings }).results).toHaveLength(flats.length);
  });
});

describe('sorting', () => {
  it('defaults to the score, sorts by a value either way with missing last and ties by score', () => {
    expect(ids(sortResults(flats, undefined, { ratings }))).toEqual(['a', 'c', 'd', 'b', 'metro']);
    expect(ids(sortResults(flats, { by: 'value', value: { prop: 'lh:areaM2' }, dir: 'desc' }, { ratings }))).toEqual([
      'd',
      'b',
      'a',
      'c',
      'metro',
    ]);
    expect(
      ids(
        sortResults(
          flats,
          { by: 'value', value: { sum: ['lh:monthlyPrice', 'lh:adminFee'] }, dir: 'asc' },
          { ratings },
        ),
      ),
    ).toEqual(['c', 'a', 'd', 'b', 'metro']);
    expect(ids(sortResults(flats, { by: 'date', prop: 'schema:datePosted', dir: 'desc' }, { ratings }))).toEqual([
      'c',
      'a',
      'b',
      'd',
      'metro',
    ]);
  });

  it("sorts by distance to the person's areas, inside first", () => {
    const area = {
      id: 'x',
      label: 'Wola',
      shape: { type: 'Circle' as const, center: [20.98, 52.23] as [number, number], radiusM: 300 },
    };
    const located = [
      flat('far', { 'schema:latitude': [52.25], 'schema:longitude': [21.0] }),
      flat('in', { 'schema:latitude': [52.2301], 'schema:longitude': [20.9801] }),
      flat('none', {}),
    ];
    expect(ids(sortResults(located, { by: 'distance' }, { areas: [area] }))).toEqual(['in', 'far', 'none']);
  });
});

describe('live counts', () => {
  it('counts a facet over the results passing the other filters', () => {
    const facets = deriveFacets(flats, model, NOW);
    const district = facets.find((f) => f.id === 'lh:district')!;
    const view: ResultsView = {
      filters: [
        { id: 'schema:numberOfRooms', label: 'Rooms', kind: 'range', value: { prop: 'schema:numberOfRooms' }, min: 2 },
      ],
    };
    const c = facetCounts(flats, view, district);
    // a, b, d (rooms ≥ 2) and the metro station (rooms not applicable to it… so it is out).
    expect(Object.fromEntries(c.options!)).toEqual({ wola: 1, mokotów: 1, śródmieście: 1 });
    const area = facets.find((f) => f.id === 'lh:areaM2')!;
    expect(facetCounts(flats, {}, area, { bins: 4 }).histogram).toEqual([1, 1, 0, 2]);
    expect(filterFor(area)).toEqual({
      id: 'lh:areaM2',
      label: 'Floor area (m²)',
      kind: 'range',
      value: { prop: 'lh:areaM2' },
    });
  });
});

describe('words and cleaning', () => {
  it('describes filters and sorts in plain words', () => {
    expect(
      describeFilter({ id: 't', label: 'Total monthly cost', kind: 'range', value: { prop: 'x:y' }, max: 6000 }),
    ).toBe('Total monthly cost ≤ 6000');
    expect(
      describeFilter({ id: 'd', label: 'District', kind: 'values', prop: 'lh:district', values: ['Wola', 'Mokotów'] }),
    ).toBe('District: Wola or Mokotów');
    expect(describeFilter({ id: 'p', label: 'Posted', kind: 'date', prop: 'schema:datePosted', days: 7 })).toBe(
      'Posted in the last 7 days',
    );
    expect(describeSort({ by: 'value', value: { prop: 'lh:areaM2' }, label: 'Floor area', dir: 'desc' })).toBe(
      'Floor area, highest first',
    );
    expect(describeSort(undefined)).toBe('Score (the rating model)');
  });

  it('keeps only well-formed filters, one per id, and drops a score sort', () => {
    const v = cleanView({
      filters: [
        { id: 'a', label: 'Rent', kind: 'range', value: { prop: 'lh:monthlyPrice' }, max: 5000, junk: 1 },
        { id: 'a', kind: 'range', value: { prop: 'lh:x' } },
        { id: 'b', kind: 'range', value: { prop: 'not a curie' } },
        { id: 'c', kind: 'flag', test: { match: 'lh:x', pattern: '(' } },
        { id: 'd', kind: 'values', prop: 'lh:district', values: ['Wola', 3, ''] },
        { id: 'e', kind: 'date', prop: 'schema:datePosted', days: 0 },
      ],
      sort: { by: 'score' },
    });
    expect(v).toEqual({
      filters: [
        { id: 'a', label: 'Rent', kind: 'range', value: { prop: 'lh:monthlyPrice' }, max: 5000 },
        { id: 'd', label: 'd', kind: 'values', prop: 'lh:district', values: ['Wola', '3'] },
      ],
    });
    expect(cleanView({ sort: { by: 'value', value: { prop: 'lh:areaM2' }, dir: 'up' } }).sort).toEqual({
      by: 'value',
      value: { prop: 'lh:areaM2' },
      dir: 'desc',
    });
    expect(cleanView(null)).toEqual({ filters: [] });
  });
});
