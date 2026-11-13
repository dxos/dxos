//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type PolylineNode } from '@dxos/scene';

import {
  bendsAfterDelete,
  bendsAfterInsert,
  polylineBends,
  polylineFrame,
  polylineMidpoints,
  polylinePath,
  polylineVertices,
  refitPolyline,
  simplifyPath,
} from './polyline.ts';

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
      bends: [],
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

describe('simplifyPath', () => {
  test('drops the samples a stroke does not need, and keeps its ends and its turns', () => {
    // A stroke along a line, wobbling under a px, then turning a corner.
    const stroke = [
      { x: 0, y: 0 },
      { x: 10, y: 0.4 },
      { x: 20, y: -0.3 },
      { x: 30, y: 0.2 },
      { x: 40, y: 0 },
      { x: 40.3, y: 10 },
      { x: 39.8, y: 20 },
      { x: 40, y: 30 },
    ];
    expect(simplifyPath(stroke, 1)).toEqual([
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 30 },
    ]);
    // A finer tolerance keeps more of it; none keeps it all.
    expect(simplifyPath(stroke, 0.35).length).toBeGreaterThan(3);
    expect(simplifyPath(stroke, 0)).toEqual(stroke);
  });

  test('one point or two are returned as they are', () => {
    expect(simplifyPath([], 1)).toEqual([]);
    expect(simplifyPath([{ x: 1, y: 1 }], 1)).toEqual([{ x: 1, y: 1 }]);
    const pair = [
      { x: 0, y: 0 },
      { x: 5, y: 5 },
    ];
    expect(simplifyPath(pair, 100)).toEqual(pair);
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

  test('a smooth line is one curve through every point, leaving each the way it came in', () => {
    const path = polylinePath(size, zigzag, { smooth: true });
    // A cubic per span, ending on each vertex in turn.
    expect(path).toMatch(/^M 0 50 C [^C]+, 50 0 C [^C]+, 100 50$/);
    // The handles either side of the middle vertex lie on one line through it: no corner there.
    const numbers = path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    const [inX, inY, , , outX, outY] = numbers.slice(4);
    expect([inX, outX].every((x, index) => (index === 0 ? x < 50 : x > 50))).toBe(true);
    expect(inY).toBeCloseTo(0);
    expect(outY).toBeCloseTo(0);
    // The frame is only as large as the points, so no part of the curve may leave it: a line that turns at an edge
    // has its handles held on that edge, where a free curve would bulge past it and be cut off.
    const box = [
      { x: 0, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ];
    const coords = (polylinePath(size, box, { smooth: true }).match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    const xs = coords.filter((_, index) => index % 2 === 0);
    const ys = coords.filter((_, index) => index % 2 === 1);
    expect([Math.min(...xs), Math.max(...xs)]).toEqual([0, size.width]);
    expect([Math.min(...ys), Math.max(...ys)]).toEqual([0, size.height]);
    // With an inset the curve keeps inside it too.
    const inset = (polylinePath(size, box, { smooth: true, inset: 2 }).match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    expect(Math.min(...inset)).toBe(2);
    expect(Math.max(...inset.filter((_, index) => index % 2 === 0))).toBe(size.width - 2);
    // Closed, it has a span back to the start; two points have no curve to draw.
    expect(polylinePath(size, zigzag, { smooth: true, closed: true })).toMatch(/^M 0 50( C [^C]+){3} Z$/);
    expect(polylinePath(size, zigzag.slice(0, 2), { smooth: true })).toBe('M 0 50 L 50 0');
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

describe('bends', () => {
  // A segment along the top that bows down to y 100 at its middle: its control is twice as far.
  const [from, to, control] = [
    { x: 0, y: 0 },
    { x: 200, y: 0 },
    { x: 100, y: 200 },
  ];

  test('the frame covers where a bent segment reaches, not its control', () => {
    const frame = polylineFrame([from, to], 0, [{ segment: 0, control }]);
    expect(frame?.bounds).toEqual({ x: 0, y: 0, width: 200, height: 100 });
    // The control is in the frame's unit space, outside the frame.
    expect(frame?.bends).toEqual([{ segment: 0, control: { x: 0.5, y: 2 } }]);
  });

  test('a bent segment is a parabola in the path, and two points close into a shape', () => {
    const size = { width: 200, height: 100 };
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ];
    const bends = [{ segment: 0, control: { x: 0.5, y: 2 } }];
    expect(polylinePath(size, points, { bends })).toBe('M 0 0 Q 100 200, 200 0');
    expect(polylinePath(size, points, { bends, closed: true })).toBe('M 0 0 Q 100 200, 200 0 L 0 0 Z');
  });

  test('a vertex put in or taken out moves the bends after it, and straightens the segments it touches', () => {
    const bends = [
      { segment: 0, control },
      { segment: 2, control },
    ];
    // Put in on segment 0, which it splits.
    expect(bendsAfterInsert(bends, 1)).toEqual([{ segment: 3, control }]);
    // Put in on segment 1, which is straight.
    expect(bendsAfterInsert(bends, 2).map(({ segment }) => segment)).toEqual([0, 3]);
    // Vertex 1 of 4 taken out: segments 0 and 1 are one.
    expect(bendsAfterDelete(bends, 1, 4)).toEqual([{ segment: 1, control }]);
    // The first of a closed line: the segment back to it and the one leaving it are one.
    expect(bendsAfterDelete([{ segment: 3, control }], 0, 4)).toEqual([]);
  });

  test('a refit keeps a bend where it is in the scene', () => {
    const node: PolylineNode = {
      type: 'polyline',
      id: 'polyline-2',
      z: 'a1',
      center: { x: 100, y: 50 },
      size: { width: 200, height: 100 },
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
      bends: [{ segment: 0, control: { x: 0.5, y: 2 } }],
    };
    expect(polylineBends(node)).toEqual([{ segment: 0, control }]);
    // The second vertex dragged out to x 400: the bow leans, and the frame follows it.
    const values = refitPolyline(node, [from, { x: 400, y: 0 }]);
    expect(values?.size.width).toBe(400);
    const moved = { ...node, ...values };
    expect(polylineBends(moved)[0].control.x).toBeCloseTo(100);
    expect(polylineBends(moved)[0].control.y).toBeCloseTo(200);
    // A line with no bends is written none.
    expect(refitPolyline(polyline(), polylineVertices(polyline()))).not.toHaveProperty('bends');
  });
});
