//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { angleBetween, bearingTo, toUnit } from './geo';
import { walkRoute, walkRouteSeries } from './path';

describe('walkRoute', () => {
  const a = toUnit({ lat: 0, lng: 0 });
  const b = toUnit({ lat: 0, lng: 10 });
  const c = toUnit({ lat: 0, lng: 20 });
  const route = [a, b, c];

  test('distance 0 returns the first point', () => {
    const result = walkRoute(route, 0);
    expect(result.unit[0]).toBeCloseTo(a[0], 9);
    expect(result.unit[1]).toBeCloseTo(a[1], 9);
    expect(result.unit[2]).toBeCloseTo(a[2], 9);
  });

  test('a distance beyond the total length returns the last point, done', () => {
    const result = walkRoute(route, 1000);
    expect(result.done).toBe(true);
    expect(result.unit[0]).toBeCloseTo(c[0], 9);
    expect(result.unit[1]).toBeCloseTo(c[1], 9);
    expect(result.unit[2]).toBeCloseTo(c[2], 9);
  });

  test('half the total length of a two-equal-segment route returns the midpoint', () => {
    const totalAngle = Math.acos(Math.min(1, Math.max(-1, a[0] * c[0] + a[1] * c[1] + a[2] * c[2])));
    const result = walkRoute(route, totalAngle / 2);
    expect(result.unit[0]).toBeCloseTo(b[0], 6);
    expect(result.unit[1]).toBeCloseTo(b[1], 6);
    expect(result.unit[2]).toBeCloseTo(b[2], 6);
  });

  test('bearing points along the segment (due east on the equator)', () => {
    const result = walkRoute(route, 0);
    expect(result.bearing).toBeCloseTo(90, 4);
  });

  test('an empty route does not throw', () => {
    expect(() => walkRoute([], 5)).not.toThrow();
  });

  test('a single-point route does not throw and returns that point, done', () => {
    const result = walkRoute([a], 5);
    expect(result.done).toBe(true);
    expect(result.unit).toEqual(a);
  });

  test('a zero-length segment is skipped without dividing by zero', () => {
    const duplicated = [a, a, c];
    expect(() => walkRoute(duplicated, 0.001)).not.toThrow();
    const result = walkRoute(duplicated, 0.001);
    expect(Number.isFinite(result.unit[0])).toBe(true);
    expect(Number.isFinite(result.bearing)).toBe(true);
  });

  // Regression: on an inclined (non-equatorial, non-meridian) great-circle segment, the true course
  // drifts continuously along its length, so mid-segment bearing must track the traveled-to point —
  // not the segment's start point, which only agrees with the true course at fraction 0.
  test('mid-segment bearing matches the true course at the traveled-to point, not the segment start', () => {
    const start = toUnit({ lat: 10, lng: 10 });
    const end = toUnit({ lat: 50, lng: 70 });
    const inclined = [start, end];
    const total = angleBetween(start, end);

    const midway = walkRoute(inclined, total * 0.5);
    const justAhead = walkRoute(inclined, total * 0.5001);
    const trueCourseAtMidpoint = bearingTo(midway.unit, justAhead.unit);

    expect(midway.bearing).toBeCloseTo(trueCourseAtMidpoint, 1);
    // The segment's initial bearing is a meaningfully different angle on an inclined segment —
    // guards against silently reverting to `bearingTo(start, end)`.
    let driftFromStart = Math.abs(midway.bearing - bearingTo(start, end));
    driftFromStart = driftFromStart > 180 ? 360 - driftFromStart : driftFromStart;
    expect(driftFromStart).toBeGreaterThan(1);
  });

  test('the arrival bearing is the course at the route end, not the last segment start', () => {
    const start = toUnit({ lat: 10, lng: 10 });
    const end = toUnit({ lat: 50, lng: 70 });
    const inclined = [start, end];
    const total = angleBetween(start, end);

    const arrived = walkRoute(inclined, total * 1.1);
    const justBefore = walkRoute(inclined, total * 0.9999);
    const trueCourseAtEnd = bearingTo(justBefore.unit, arrived.unit);

    expect(arrived.done).toBe(true);
    expect(arrived.bearing).toBeCloseTo(trueCourseAtEnd, 1);
  });
});

describe('walkRouteSeries', () => {
  const start = toUnit({ lat: 10, lng: 10 });
  const middle = toUnit({ lat: 25, lng: 35 });
  const end = toUnit({ lat: 50, lng: 70 });
  const route = [start, middle, end];

  test('matches walkRoute at every distance, in one pass', ({ expect }) => {
    const spacing = 0.02;
    const first = -0.05;
    const points: number[][] = [];
    walkRouteSeries(route, first, spacing, 12, (index, unit) => {
      points[index] = [...unit];
    });

    expect(points).toHaveLength(12);
    points.forEach((point, index) => {
      const expected = walkRoute(route, first + index * spacing).unit;
      expect(point[0]).toBeCloseTo(expected[0], 9);
      expect(point[1]).toBeCloseTo(expected[1], 9);
      expect(point[2]).toBeCloseTo(expected[2], 9);
    });
  });

  test('visits every index for degenerate routes', ({ expect }) => {
    const visited: number[] = [];
    walkRouteSeries([], 0, 0.01, 4, (index) => visited.push(index));
    expect(visited).toEqual([0, 1, 2, 3]);

    visited.length = 0;
    walkRouteSeries([start], 0, 0.01, 3, (index, unit) => {
      visited.push(index);
      expect(unit).toEqual(start);
    });
    expect(visited).toEqual([0, 1, 2]);
  });

  test('clamps past the end of the route to its final point', ({ expect }) => {
    const seen: number[][] = [];
    walkRouteSeries(route, 10, 1, 3, (index, unit) => {
      seen[index] = [...unit];
    });
    seen.forEach((point) => expect(point).toEqual(end));
  });
});
