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
    const d = polygonPath({ width: 100, height: 80 }, { inset: 2, sides: 5 });
    expect(d.startsWith('M 50 ')).toBe(true);
    expect(d.split(' L ')).toHaveLength(5);
    expect(d.endsWith(' Z')).toBe(true);
  });

  test('regular in any frame, and centred in it by its own bounds', () => {
    const size = { width: 300, height: 100 };
    for (const sides of [3, 5, 6]) {
      const points = vertices(polygonPath(size, { sides }));
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

  test('fit to a circle puts every vertex on the circle that fits the frame, centred on it', () => {
    const size = { width: 300, height: 100 };
    for (const sides of [3, 5, 6]) {
      for (const { x, y } of vertices(polygonPath(size, { sides, fit: 'circle' }))) {
        expect(Math.hypot(x - 150, y - 50)).toBeCloseTo(50, 1);
      }
    }
    // A sharp corner's mitred stroke stays on the circle: a triangle's tip reaches twice the inset past its vertex.
    const [top] = vertices(polygonPath({ width: 100, height: 100 }, { sides: 3, fit: 'circle', inset: 2 }));
    expect(top.y - 2 / Math.sin(Math.PI / 6)).toBeCloseTo(0, 1);
    // A triangle on the circle leaves room below its base, where fitting the frame would fill it.
    const ys = vertices(polygonPath({ width: 100, height: 100 }, { sides: 3, fit: 'circle' })).map(({ y }) => y);
    expect(Math.max(...ys)).toBeCloseTo(75, 1);
  });

  test('rounded corners are an arc per vertex, the radius capped by half an edge', () => {
    const d = polygonPath({ width: 100, height: 100 }, { sides: 6, radius: 8 });
    expect(d.match(/ A /g)).toHaveLength(6);
    expect(d.match(/ L /g)).toHaveLength(6);
    const radius = (path: string) => Number(path.split(' A ')[1].split(' ')[0]);
    expect(radius(d)).toBeCloseTo(8, 1);
    // A radius larger than the edges allow meets at each edge's midpoint instead.
    const capped = polygonPath({ width: 100, height: 100 }, { sides: 6, radius: 1000 });
    expect(radius(capped)).toBeLessThan(1000);
    expect(polygonPath({ width: 100, height: 100 }, { sides: 6, radius: 0 })).not.toContain(' A ');
  });

  test('a triangle at least', () => {
    expect(polygonPath({ width: 100, height: 100 }, { sides: 2 }).split(' L ')).toHaveLength(3);
  });
});
