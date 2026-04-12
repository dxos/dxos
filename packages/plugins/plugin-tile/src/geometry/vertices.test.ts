//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { tileVertices, verticesToSvgPoints } from './vertices';

describe('tileVertices', () => {
  describe('square grid', () => {
    test('returns 4 vertices', ({ expect }) => {
      const vertices = tileVertices(0, 0, 'square', 50);
      expect(vertices).toHaveLength(4);
    });

    test('vertices form a square centered on origin', ({ expect }) => {
      const vertices = tileVertices(0, 0, 'square', 50);
      // half = 25
      expect(vertices[0]).toEqual({ x: -25, y: -25 });
      expect(vertices[1]).toEqual({ x: 25, y: -25 });
      expect(vertices[2]).toEqual({ x: 25, y: 25 });
      expect(vertices[3]).toEqual({ x: -25, y: 25 });
    });

    test('vertices shift with non-zero axial coordinates', ({ expect }) => {
      const vertices = tileVertices(2, 1, 'square', 50);
      // center = (100, 50), half = 25
      expect(vertices[0]).toEqual({ x: 75, y: 25 });
      expect(vertices[1]).toEqual({ x: 125, y: 25 });
      expect(vertices[2]).toEqual({ x: 125, y: 75 });
      expect(vertices[3]).toEqual({ x: 75, y: 75 });
    });

    test('all vertices are equidistant from center (square)', ({ expect }) => {
      const vertices = tileVertices(3, 2, 'square', 60);
      const center = { x: 3 * 60, y: 2 * 60 };
      const distances = vertices.map((v) => Math.hypot(v.x - center.x, v.y - center.y));
      // All corner distances should be equal (half-diagonal = 30*sqrt(2))
      distances.forEach((dist) => expect(dist).toBeCloseTo(distances[0], 5));
    });
  });

  describe('hex grid', () => {
    test('returns 6 vertices', ({ expect }) => {
      const vertices = tileVertices(0, 0, 'hex', 50);
      expect(vertices).toHaveLength(6);
    });

    test('all vertices are tileSize away from center (flat-top hex)', ({ expect }) => {
      const tileSize = 50;
      const vertices = tileVertices(0, 0, 'hex', tileSize);
      vertices.forEach((vertex) => {
        const dist = Math.hypot(vertex.x, vertex.y);
        expect(dist).toBeCloseTo(tileSize, 5);
      });
    });

    test('first vertex is at angle 0° (rightmost point for flat-top)', ({ expect }) => {
      const tileSize = 50;
      const vertices = tileVertices(0, 0, 'hex', tileSize);
      expect(vertices[0].x).toBeCloseTo(tileSize, 5);
      expect(vertices[0].y).toBeCloseTo(0, 5);
    });

    test('hex vertices shift with non-zero axial coordinates', ({ expect }) => {
      const tileSize = 50;
      const vertices = tileVertices(1, 0, 'hex', tileSize);
      const centerX = tileSize * (3 / 2) * 1;
      const centerY = tileSize * Math.sqrt(3) * (0 + 1 / 2);
      // First vertex should be at angle 0° from shifted center
      expect(vertices[0].x).toBeCloseTo(centerX + tileSize, 5);
      expect(vertices[0].y).toBeCloseTo(centerY, 5);
    });
  });

  describe('triangle grid', () => {
    test('returns 3 vertices for upward triangle (q+r even)', ({ expect }) => {
      // q=0, r=0 → q+r=0, even → up triangle
      const vertices = tileVertices(0, 0, 'triangle', 50);
      expect(vertices).toHaveLength(3);
    });

    test('returns 3 vertices for downward triangle (q+r odd)', ({ expect }) => {
      // q=1, r=0 → q+r=1, odd → down triangle
      const vertices = tileVertices(1, 0, 'triangle', 50);
      expect(vertices).toHaveLength(3);
    });

    test('upward triangle apex is above center', ({ expect }) => {
      const tileSize = 50;
      const h = (tileSize * Math.sqrt(3)) / 2;
      // q=0, r=0 → up triangle; center at (0,0)
      const vertices = tileVertices(0, 0, 'triangle', tileSize);
      // apex at top
      expect(vertices[0].x).toBeCloseTo(0, 5);
      expect(vertices[0].y).toBeCloseTo(-(2 / 3) * h, 5);
    });

    test('downward triangle apex is below center', ({ expect }) => {
      const tileSize = 50;
      const h = (tileSize * Math.sqrt(3)) / 2;
      // q=1, r=0 → q+r=1, odd → down triangle; center at (25,0)
      const vertices = tileVertices(1, 0, 'triangle', tileSize);
      const centerX = (tileSize / 2) * 1;
      // apex at bottom
      expect(vertices[0].x).toBeCloseTo(centerX, 5);
      expect(vertices[0].y).toBeCloseTo((2 / 3) * h, 5);
    });
  });
});

describe('verticesToSvgPoints', () => {
  test('produces correct SVG points string format', ({ expect }) => {
    const points = verticesToSvgPoints([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]);
    expect(points).toBe('0,0 10,0 10,10');
  });

  test('handles single vertex', ({ expect }) => {
    expect(verticesToSvgPoints([{ x: 5, y: 7 }])).toBe('5,7');
  });

  test('handles empty array', ({ expect }) => {
    expect(verticesToSvgPoints([])).toBe('');
  });

  test('produces correct string for square tile', ({ expect }) => {
    const vertices = tileVertices(0, 0, 'square', 50);
    const svgPoints = verticesToSvgPoints(vertices);
    expect(svgPoints).toBe('-25,-25 25,-25 25,25 -25,25');
  });
});
