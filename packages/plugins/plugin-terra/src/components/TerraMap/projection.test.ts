//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { toUnit } from '../../sim/index.ts';
import { MAP_HEIGHT, MAP_WIDTH, project, projectPath, splitPath } from './projection.ts';

describe('project', () => {
  test('maps the corners and centre of the graticule', ({ expect }) => {
    expect(project(toUnit({ lat: 0, lng: 0 }))).toEqual({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 });
    const northPole = project(toUnit({ lat: 90, lng: 0 }));
    expect(northPole.y).toBeCloseTo(0, 6);
    const southEast = project(toUnit({ lat: -45, lng: 90 }));
    expect(southEast.x).toBeCloseTo(270, 6);
    expect(southEast.y).toBeCloseTo(135, 6);
  });
});

describe('splitPath', () => {
  test('leaves a path that stays on the map in one segment', ({ expect }) => {
    const segments = splitPath([
      { x: 100, y: 20 },
      { x: 140, y: 30 },
      { x: 180, y: 40 },
    ]);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toHaveLength(3);
  });

  test('splits an eastward antimeridian crossing at the map edges', ({ expect }) => {
    const segments = splitPath([
      { x: 350, y: 40 },
      { x: 10, y: 60 },
    ]);
    expect(segments).toHaveLength(2);
    // Crossing 10 degrees into a 20 degree run puts the edge latitude halfway between the ends.
    expect(segments[0].at(-1)).toEqual({ x: MAP_WIDTH, y: 50 });
    expect(segments[1][0]).toEqual({ x: 0, y: 50 });
  });

  test('splits a westward crossing at the opposite edges', ({ expect }) => {
    const segments = splitPath([
      { x: 10, y: 60 },
      { x: 350, y: 40 },
    ]);
    expect(segments).toHaveLength(2);
    expect(segments[0].at(-1)).toEqual({ x: 0, y: 50 });
    expect(segments[1][0]).toEqual({ x: MAP_WIDTH, y: 50 });
  });

  test('drops a segment left with a single point', ({ expect }) => {
    expect(splitPath([{ x: 10, y: 10 }])).toEqual([]);
    expect(splitPath([])).toEqual([]);
  });
});

describe('projectPath', () => {
  test('emits one polyline point list per non-wrapping segment', ({ expect }) => {
    const path = [toUnit({ lat: 0, lng: 170 }), toUnit({ lat: 10, lng: 178 }), toUnit({ lat: 20, lng: -175 })];
    const polylines = projectPath(path);
    expect(polylines).toHaveLength(2);
    expect(polylines[0].startsWith('350.00,90.00')).toBe(true);
    expect(polylines[1].startsWith('0.00,')).toBe(true);
  });

  test('bows a long leg along its great circle rather than drawing it straight', ({ expect }) => {
    // Same latitude, half the globe apart: the great circle runs far north of the parallel the two
    // ends share, so the drawn path must not stay on it.
    const [polyline] = projectPath([toUnit({ lat: 60, lng: -90 }), toUnit({ lat: 60, lng: 90 })]);
    const latitudes = polyline.split(' ').map((point) => 90 - Number(point.split(',')[1]));
    expect(latitudes.length).toBeGreaterThan(10);
    expect(Math.max(...latitudes)).toBeGreaterThan(70);
  });
});
