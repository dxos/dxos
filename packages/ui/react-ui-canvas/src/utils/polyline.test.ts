//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type PolylineNode } from '@dxos/scene';

import {
  bendsAfterDelete,
  bendsAfterInsert,
  bendsWithVertex,
  cubicPoint,
  polylineBends,
  polylineFrame,
  polylineMidpoints,
  polylinePath,
  polylineVertices,
  refitPolyline,
  simplifyPath,
  smoothBends,
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

  test('a vertex put in on a bent segment splits its curve in two, and moves the bends after it', () => {
    const vertices = [from, to, { x: 200, y: 100 }, { x: 0, y: 100 }];
    const bends = [
      { segment: 0, control },
      { segment: 2, control: { x: 100, y: 300 } },
    ];
    // Put in on segment 0: each half's control is midway from an end to the old control.
    expect(bendsAfterInsert(bends, 1, vertices)).toEqual([
      { segment: 0, control: { x: 50, y: 100 } },
      { segment: 1, control: { x: 150, y: 100 } },
      { segment: 3, control: { x: 100, y: 300 } },
    ]);
    // The two halves draw the curve the one segment did: its middle is where they meet.
    expect(polylineMidpoints(vertices, false, bends)[0]).toEqual({ index: 1, point: { x: 100, y: 100 } });
    // Put in on segment 1, which is straight.
    expect(bendsAfterInsert(bends, 2, vertices).map(({ segment }) => segment)).toEqual([0, 3]);
  });

  test('a vertex taken out joins the two segments that met there, bent where either was', () => {
    // A peak with a bent segment either side: out to (100, 100) and back.
    const vertices = [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      { x: 200, y: 0 },
    ];
    const bends = [
      { segment: 0, control: { x: 0, y: 100 } },
      { segment: 1, control: { x: 200, y: 100 } },
    ];
    // The joined segment leaves and arrives as the two did: straight down from one end and up to the other never
    // meet, so its control is midway between theirs.
    expect(bendsAfterDelete(bends, 1, vertices)).toEqual([{ segment: 0, control: { x: 100, y: 100 } }]);
    // One bent and one straight: the bend is kept.
    expect(bendsAfterDelete([bends[0]], 1, vertices)).toEqual([{ segment: 0, control: { x: 0, y: 100 } }]);
    // Neither bent, and a bend further on moves one nearer.
    expect(bendsAfterDelete([{ segment: 2, control }], 1, [...vertices, { x: 100, y: -50 }])).toEqual([
      { segment: 1, control },
    ]);
  });

  test('a line through points placed by hand runs as one curve, each segment a cubic', () => {
    const points = [
      { x: 0, y: 100 },
      { x: 120, y: 0 },
      { x: 240, y: 100 },
      { x: 360, y: 0 },
    ];
    const bends = smoothBends(points);
    expect(bends.map(({ segment }) => segment)).toEqual([0, 1, 2]);
    // The way through an inner point is that from the point before it to the one after: level here, so the
    // controls either side of it are at its height, and the line does not turn a corner there.
    expect(bends[0].second).toEqual({ x: 80, y: 0 });
    expect(bends[1].control).toEqual({ x: 160, y: 0 });
    // The middle segment bows one way and then the other, which one control could not do.
    expect(bends[1].second).toEqual({ x: 200, y: 100 });
    // Closed, every segment has one, the closing segment too.
    expect(smoothBends(points.slice(0, 3), true)).toHaveLength(3);
    // A cubic is a `C` in the path, and the frame covers where it reaches.
    const frame = polylineFrame(points, 0, bends);
    expect(
      polylinePath(frame?.bounds ?? { width: 0, height: 0 }, frame?.points ?? [], { bends: frame?.bends }),
    ).toMatch(/^M [\d. -]+( C [\d. -]+, [\d. -]+, [\d. -]+){3}$/);
  });

  test('a vertex put in on a cubic splits it into two that draw the same curve', () => {
    const [start, end] = [from, to];
    const cubic = { segment: 0, control: { x: 0, y: 120 }, second: { x: 200, y: 120 } };
    const [left, right] = bendsAfterInsert([cubic], 1, [start, end]);
    const middle = polylineMidpoints([start, end], false, [cubic])[0].point;
    expect(middle).toEqual({ x: 100, y: 90 });
    // A quarter of the way along the whole is half of the way along its first half.
    const whole = cubicPoint(start, cubic.control, cubic.second, end, 0.25);
    const half = cubicPoint(start, left.control, left.second ?? middle, middle, 0.5);
    expect(half.x).toBeCloseTo(whole.x);
    expect(half.y).toBeCloseTo(whole.y);
    expect(right.segment).toBe(1);
    // Taken out again, the one segment leaves and arrives as the two did.
    const [joined] = bendsAfterDelete([left, right], 1, [start, middle, end]);
    expect(joined.segment).toBe(0);
    expect(joined.control).toEqual(left.control);
    expect(joined.second).toEqual(right.second);
  });

  test("a vertex that moves takes its own controls with it, and leaves its neighbours' where they are", () => {
    const points = [
      { x: 0, y: 100 },
      { x: 120, y: 0 },
      { x: 240, y: 100 },
    ];
    const bends = smoothBends(points);
    const delta = { x: 12, y: -24 };
    const moved = bendsWithVertex(bends, 1, points.length, delta);
    // The control it arrives by and the one it leaves toward.
    expect(moved[0].second).toEqual({ x: (bends[0].second?.x ?? 0) + 12, y: (bends[0].second?.y ?? 0) - 24 });
    expect(moved[1].control).toEqual({ x: bends[1].control.x + 12, y: bends[1].control.y - 24 });
    // The controls at the other ends of those two segments are the neighbours' own.
    expect(moved[0].control).toEqual(bends[0].control);
    expect(moved[1].second).toEqual(bends[1].second);
    // The first vertex of an open line has no segment arriving, and a parabola's one control is both its ends'.
    expect(bendsWithVertex(bends, 0, points.length, delta)[1]).toEqual(bends[1]);
    const parabola = [{ segment: 0, control }];
    expect(bendsWithVertex(parabola, 0, 2, delta)).toEqual(parabola);
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
    // A cubic keeps both of its controls, turned with the line.
    const turned: PolylineNode = {
      ...node,
      rotation: 90,
      bends: [{ segment: 0, control: { x: 0.25, y: 1 }, second: { x: 0.75, y: 1 } }],
    };
    const refitted = { ...turned, ...refitPolyline(turned, polylineVertices(turned)) };
    polylineBends(refitted).forEach((bend, index) => {
      expect(bend.second?.x).toBeCloseTo(polylineBends(turned)[index].second?.x ?? Number.NaN);
      expect(bend.second?.y).toBeCloseTo(polylineBends(turned)[index].second?.y ?? Number.NaN);
      expect(bend.control.x).toBeCloseTo(polylineBends(turned)[index].control.x);
    });
    // A line with no bends is written none.
    expect(refitPolyline(polyline(), polylineVertices(polyline()))).not.toHaveProperty('bends');
  });
});
