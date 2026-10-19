//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { cloudPath, polygonPath } from './silhouette.ts';

const ARC = /A ([\d.]+) [\d.]+ 0 [01] 1 ([\d.-]+) ([\d.-]+)/g;

describe('cloudPath', () => {
  test('a closed ring of arcs whose ends lie inside the inset frame', () => {
    const size = { width: 300, height: 200 };
    const inset = 4;
    const d = cloudPath(size, inset);
    expect(d.startsWith('M ')).toBe(true);
    expect(d.endsWith(' Z')).toBe(true);
    const arcs = [...d.matchAll(ARC)];
    expect(arcs).toHaveLength(9);
    for (const [, radius, x, y] of arcs) {
      expect(Number(radius)).toBeGreaterThan(0);
      expect(Number(x)).toBeGreaterThan(inset);
      expect(Number(x)).toBeLessThan(size.width - inset);
      expect(Number(y)).toBeGreaterThan(inset);
      expect(Number(y)).toBeLessThan(size.height - inset);
    }
  });

  test('takes its bump count, at least three', () => {
    const size = { width: 200, height: 100 };
    expect([...cloudPath(size, 0, 14).matchAll(ARC)]).toHaveLength(14);
    expect([...cloudPath(size, 0, 1).matchAll(ARC)]).toHaveLength(3);
  });

  test('scales with the frame', () => {
    expect(cloudPath({ width: 100, height: 100 })).not.toEqual(cloudPath({ width: 200, height: 100 }));
  });
});

/** The vertices of a polygon path. */
const vertices = (d: string) =>
  [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(([, x, y]) => ({ x: Number(x), y: Number(y) }));

describe('polygonPath', () => {
  test('a vertex per side, the first centred on top', () => {
    const d = polygonPath({ width: 100, height: 80 }, 2, 5);
    expect(d.startsWith('M 50 ')).toBe(true);
    expect(d.split(' L ')).toHaveLength(5);
    expect(d.endsWith(' Z')).toBe(true);
  });

  test('regular in any frame, and centred in it by its own bounds', () => {
    const size = { width: 300, height: 100 };
    for (const sides of [3, 5, 6]) {
      const points = vertices(polygonPath(size, 0, sides));
      const xs = points.map(({ x }) => x);
      const ys = points.map(({ y }) => y);
      expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(150, 1);
      expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(50, 1);
      // Fits the height (the shorter side), and every edge is as long as the first.
      expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(100, 1);
      const edges = points.map((point, index) => {
        const next = points[(index + 1) % points.length];
        return Math.hypot(next.x - point.x, next.y - point.y);
      });
      for (const edge of edges) {
        expect(edge).toBeCloseTo(edges[0], 1);
      }
    }
  });

  test('a triangle at least', () => {
    expect(polygonPath({ width: 100, height: 100 }, 0, 2).split(' L ')).toHaveLength(3);
  });
});
