//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { applyOverrides, rateAll } from '../../model/rating.ts';
import { geoModel, geoOverrides, geoResults } from '../../testing/geo-fixture.ts';
import {
  areaNoteOf,
  clusterPins,
  colourOf,
  countInside,
  hueOf,
  metres,
  nameFor,
  simplify,
  summarize,
  toPins,
} from './pins.ts';

const describePin = (item: { props: Record<string, ReadonlyArray<unknown>> }) => ({
  title: String(item.props['schema:name']?.[0] ?? ''),
  detail: '',
});

describe('results map', () => {
  const ratings = rateAll(applyOverrides(geoModel, geoOverrides), geoResults);
  const areas = geoOverrides.areas ?? [];

  test('pins the located results, metro stations as landmarks', ({ expect }) => {
    const pins = toPins(geoResults, ratings, areas, describePin);
    expect(pins).toHaveLength(16);
    expect(pins.filter((pin) => pin.landmark)).toHaveLength(4);
    expect(pins.filter((pin) => !pin.landmark).every((pin) => pin.fit !== undefined && pin.score !== undefined)).toBe(
      true,
    );
    const summary = summarize(pins, geoResults.length);
    expect(summary).toMatchObject({ rated: 12, landmarks: 4, ratable: 16, unlocated: 4 });
    expect(summary.inside + summary.near).toBeGreaterThan(0);
  });

  test('notes cards outside the areas and with no location', ({ expect }) => {
    const notes = geoResults.map((item) => areaNoteOf(item, areas));
    expect(notes.filter((note) => note === 'no-location')).toHaveLength(4);
    expect(notes.some((note) => note === 'outside')).toBe(true);
    expect(geoResults.every((item) => areaNoteOf(item, []) === undefined)).toBe(true);
  });

  test('counts pins inside an area and names a new one after its neighbourhood', ({ expect }) => {
    const pins = toPins(geoResults, ratings, areas, describePin);
    const [around, mokotow] = areas;
    expect(around && countInside(pins, around)).toBe(0);
    expect(mokotow && countInside(pins, mokotow)).toBe(1);
    expect(mokotow && nameFor(mokotow.shape, geoResults, 3)).toBe('Stary Mokotów');
    expect(nameFor({ type: 'Circle', center: [0.5, 0.5], radiusM: 10 }, geoResults, 3)).toBe('Area 3');
  });

  test('clusters on a pixel grid and simplifies a lasso', ({ expect }) => {
    const points = [
      { id: 'a', x: 1, y: 1 },
      { id: 'b', x: 30, y: 20 },
      { id: 'c', x: 100, y: 100 },
    ];
    expect(clusterPins(points, (point) => point).map((group) => group.map((point) => point.id))).toEqual([
      ['a', 'b'],
      ['c'],
    ]);
    expect(clusterPins(points, (point) => point, { exact: true })).toHaveLength(3);
    const line = Array.from({ length: 50 }, (_, index) => ({ x: index, y: index < 25 ? 0 : index - 25 }));
    expect(simplify(line, 1)).toHaveLength(3);
  });

  test('colours by score and labels distances', ({ expect }) => {
    expect(hueOf(1, 0, 1)).toBe(130);
    expect(hueOf(0, 0, 1)).toBe(8);
    expect(colourOf(undefined)).toBe('#8a8a8a');
    expect(metres(400)).toBe('400 m');
    expect(metres(1250)).toBe('1.3 km');
  });
});
