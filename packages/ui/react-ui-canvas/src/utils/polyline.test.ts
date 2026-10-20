//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { polylineFrame, polylinePath } from './polyline.ts';

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
