//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type PolylineNode } from '../model/index.ts';
import { polylineFrame, polylineMidpoints, polylinePath, polylineVertices, refitPolyline } from './polyline.ts';

const polyline = (rotation?: number): PolylineNode => ({
  type: 'polyline',
  id: 'polyline-1',
  z: 'a0',
  center: { x: 100, y: 50 },
  size: { width: 200, height: 100 },
  rotation,
  points: [
    { x: 0, y: 1 },
    { x: 0.5, y: 0 },
    { x: 1, y: 1 },
  ],
});

const near = (point: { x: number; y: number }) => ({
  x: Math.round(point.x * 1e6) / 1e6,
  y: Math.round(point.y * 1e6) / 1e6,
});

describe('polylineFrame', () => {
  test('frames the points and puts them in its unit space', () => {
    const frame = polylineFrame([
      { x: 100, y: 50 },
      { x: 300, y: 250 },
      { x: 200, y: 50 },
    ]);
    expect(frame).toEqual({
      bounds: { x: 100, y: 50, width: 200, height: 200 },
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 0.5, y: 0 },
      ],
    });
  });

  test('widens a straight run to the minimum about its centre', () => {
    const frame = polylineFrame(
      [
        { x: 0, y: 100 },
        { x: 200, y: 100 },
      ],
      16,
    );
    expect(frame?.bounds).toEqual({ x: 0, y: 92, width: 200, height: 16 });
    expect(frame?.points).toEqual([
      { x: 0, y: 0.5 },
      { x: 1, y: 0.5 },
    ]);
  });

  test('has no frame without points', () => {
    expect(polylineFrame([])).toBeUndefined();
  });
});

describe('polylinePath', () => {
  const size = { width: 100, height: 50 };
  const zigzag = [
    { x: 0, y: 1 },
    { x: 0.5, y: 0 },
    { x: 1, y: 1 },
  ];

  test('an open line runs through the points scaled to the frame', () => {
    expect(polylinePath(size, zigzag)).toBe('M 0 50 L 50 0 L 100 50');
  });

  test('a closed line returns to its start', () => {
    expect(polylinePath(size, zigzag, { closed: true })).toBe('M 0 50 L 50 0 L 100 50 Z');
  });

  test('keeps the inset inside the frame', () => {
    expect(polylinePath(size, zigzag, { inset: 2 })).toBe('M 2 48 L 50 2 L 98 48');
  });

  test('drops a repeated vertex, and a closing one that repeats the first', () => {
    const points = [...zigzag.slice(0, 2), zigzag[1], ...zigzag.slice(2), zigzag[0]];
    expect(polylinePath(size, points, { closed: true })).toBe('M 0 50 L 50 0 L 100 50 Z');
  });

  test('rounds only the inner corners of an open line', () => {
    const d = polylinePath(size, zigzag, { radius: 8 });
    expect(d.startsWith('M 0 50 L ')).toBe(true);
    expect(d.endsWith(' L 100 50')).toBe(true);
    expect(d.match(/ A /g)).toHaveLength(1);
  });

  test('rounds every corner of a closed line, turning the same way round', () => {
    const d = polylinePath(size, zigzag, { closed: true, radius: 8 });
    expect(d.match(/ A /g)).toHaveLength(3);
    expect(new Set([...d.matchAll(/ A [\d.]+ [\d.]+ 0 0 ([01])/g)].map(([, sweep]) => sweep)).size).toBe(1);
    expect(d.endsWith(' Z')).toBe(true);
  });

  test('a straight run has no corner to round', () => {
    const line = [
      { x: 0, y: 0.5 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 0.5 },
    ];
    expect(polylinePath(size, line, { radius: 8 })).toBe('M 0 25 L 50 25 L 100 25');
  });
});

describe('polylineVertices', () => {
  test('places the unit points in the frame', () => {
    expect(polylineVertices(polyline())).toEqual([
      { x: 0, y: 100 },
      { x: 100, y: 0 },
      { x: 200, y: 100 },
    ]);
  });

  test('turns them with the node', () => {
    expect(polylineVertices(polyline(90)).map(near)).toEqual([
      { x: 50, y: -50 },
      { x: 150, y: 50 },
      { x: 50, y: 150 },
    ]);
  });
});

describe('refitPolyline', () => {
  test('moving a vertex out of the frame grows it and renormalises the points', () => {
    const node = polyline();
    const vertices = polylineVertices(node);
    vertices[1] = { x: 100, y: -100 };
    expect(refitPolyline(node, vertices)).toEqual({
      center: { x: 100, y: 0 },
      size: { width: 200, height: 200 },
      points: [
        { x: 0, y: 1 },
        { x: 0.5, y: 0 },
        { x: 1, y: 1 },
      ],
    });
  });

  test('moving a vertex inward shrinks the frame', () => {
    const node = polyline();
    const vertices = polylineVertices(node);
    vertices[2] = { x: 100, y: 100 };
    expect(refitPolyline(node, vertices)).toEqual({
      center: { x: 50, y: 50 },
      size: { width: 100, height: 100 },
      points: [
        { x: 0, y: 1 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
      ],
    });
  });

  test('a rotated line keeps its rotation and its vertices land where they were put', () => {
    const node = polyline(30);
    const vertices = polylineVertices(node);
    vertices[0] = { x: vertices[0].x - 40, y: vertices[0].y + 10 };
    const values = refitPolyline(node, vertices);
    expect(values).toBeDefined();
    if (values) {
      expect(polylineVertices({ ...node, ...values }).map(near)).toEqual(vertices.map(near));
    }
  });

  test('unchanged vertices give back the same frame', () => {
    const node = polyline();
    expect(refitPolyline(node, polylineVertices(node))).toEqual({
      center: node.center,
      size: node.size,
      points: node.points,
    });
  });
});

describe('polylineMidpoints', () => {
  const vertices = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ];

  test('an open line has one per segment', () => {
    expect(polylineMidpoints(vertices, false)).toEqual([
      { index: 1, point: { x: 5, y: 0 } },
      { index: 2, point: { x: 10, y: 5 } },
    ]);
  });

  test('a closed line has its closing segment too', () => {
    expect(polylineMidpoints(vertices, true)).toHaveLength(3);
    expect(polylineMidpoints(vertices, true)[2]).toEqual({ index: 3, point: { x: 5, y: 5 } });
  });
});
