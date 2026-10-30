//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { grooveHeads, grooveTrim, markerFrame, markerTrim, trimPath } from './link-ends.ts';
import { flattenPath } from './path.ts';

/** How far a mitred tip reaches past its vertex, for arms at the ends' half-angle. */
const miter = (width: number) => width / 2 / Math.sin(Math.atan2(5, 10));

describe('marker ends', () => {
  test("a pointed marker's mitred tip and a circle's far side are at the anchor, at any stroke", ({ expect }) => {
    for (const stroke of [1, 2, 6]) {
      const arrow = markerFrame('arrow', 16, stroke);
      // The vertex is at 10 view units; the mitre reaches past it to the anchor.
      expect((arrow.refX - 10) * (arrow.size / arrow.view)).toBeCloseTo(miter(stroke));
      expect(markerFrame('triangle', 16, stroke).refX).toBe(arrow.refX);
      const circle = markerFrame('circle', 16, stroke);
      // The ring's outer edge: radius 4 about 5, and half the stroke.
      expect((circle.refX - 9) * (circle.size / circle.view)).toBeCloseTo(stroke / 2);
    }
  });

  test("the line stops where its edges meet the arrow's arms, whatever its width", ({ expect }) => {
    const tan = Math.tan(Math.atan2(5, 10));
    for (const width of [2, 8, 12]) {
      const trim = markerTrim('arrow', 16, 2, { width, round: false });
      // The inner vertex is two mitres back; the line's corner lies on the arm's inner edge.
      expect((trim - miter(2) * 2) * tan).toBeCloseTo(width / 2);
      // A round cap stops a further half width back, so it does not reach past the corners.
      expect(markerTrim('arrow', 16, 2, { width, round: true })).toBeCloseTo(trim + width / 2);
    }
    // Hollow ends cover the line from their base or centre on.
    const triangle = markerFrame('triangle', 16, 2);
    expect(markerTrim('triangle', 16, 2, { width: 8, round: false })).toBeCloseTo(miter(2) + triangle.size * (10 / 12));
    const circle = markerFrame('circle', 16, 2);
    expect(markerTrim('circle', 16, 2, { width: 8, round: true })).toBeCloseTo(circle.size * (4 / 10) + 1);
  });
});

describe('groove heads', () => {
  const corners = (path: string) => flattenPath(path)[0];

  test("an arrow's mitred tip is at the end and the track stops at its vertex, pointing along the arrival", ({
    expect,
  }) => {
    // Arriving left to right at (100, 0), as a smart link's last straight run does.
    const path = 'M 0 40 L 50 40 Q 60 40, 60 30 L 60 0 L 100 0';
    const [upper, vertex, lower] = corners(grooveHeads(path, { end: 'arrow' }, 8, 16));
    expect(vertex.x + miter(8)).toBeCloseTo(100);
    expect(vertex.y).toBeCloseTo(0);
    expect(upper.x).toBeLessThan(vertex.x);
    expect(upper.y).toBeCloseTo(-lower.y);
    expect(grooveTrim('arrow', 8, 16)).toBeCloseTo(miter(8));
  });

  test('a start head points back along the route', ({ expect }) => {
    const [, vertex] = corners(grooveHeads('M 0 0 L 0 100', { start: 'arrow' }, 8, 16));
    expect(vertex.x).toBeCloseTo(0);
    expect(vertex.y).toBeCloseTo(miter(8));
  });

  test("a ring's far side is at the end, and the track stops at its near side", ({ expect }) => {
    const head = grooveHeads('M 0 0 L 100 0', { end: 'circle' }, 8, 16);
    // Radius 12 about 84: its outer edge, half the channel out, is at the end; its near side at 72.
    expect(head).toContain('A 12 12');
    expect(head.startsWith('M 72 0')).toBe(true);
    expect(100 - grooveTrim('circle', 8, 16)).toBeCloseTo(72);
  });

  test('a degenerate route draws no heads', ({ expect }) => {
    expect(grooveHeads('M 5 5', { end: 'arrow' }, 8, 16)).toBe('');
    expect(grooveHeads('M 5 5 L 5 5', { end: 'arrow' }, 8, 16)).toBe('');
  });
});

describe('trimPath', () => {
  test('cuts a straight route by the given lengths at each end', ({ expect }) => {
    expect(trimPath('M 0 0 L 100 0', 10, 25)).toBe('M 10 0 L 75 0');
    expect(trimPath('M 0 0 L 100 0', 0, 0)).toBe('M 0 0 L 100 0');
  });

  test("cuts into a smart link's rounded corner and past whole segments, keeping the curve", ({ expect }) => {
    // 50 across, a corner of radius 10, then 30 down.
    const path = 'M 0 0 L 40 0 Q 50 0, 50 10 L 50 40';
    const trimmed = trimPath(path, 0, 35);
    expect(trimmed).toMatch(/^M 0 0 L 40 0 Q /);
    const end = corners(trimmed).at(-1);
    expect(end?.x).toBeGreaterThan(40);
    expect(end?.y).toBeGreaterThan(0);
    expect(end?.y).toBeLessThan(10);
  });

  test('cuts a curve along its length, ending on it', ({ expect }) => {
    const path = 'M 0 0 C 50 0, 50 100, 100 100';
    const points = flattenPath(path)[0];
    const trimmed = trimPath(path, 0, 20);
    expect(trimmed.startsWith('M 0 0 C ')).toBe(true);
    const end = corners(trimmed).at(-1);
    // The end is still on the curve, about 20 back from its end.
    const nearest = Math.min(...points.map((point) => Math.hypot(point.x - (end?.x ?? 0), point.y - (end?.y ?? 0))));
    expect(nearest).toBeLessThan(5);
    expect(Math.hypot(100 - (end?.x ?? 0), 100 - (end?.y ?? 0))).toBeCloseTo(20, 0);
  });

  test('leaves nothing when the ends meet', ({ expect }) => {
    expect(trimPath('M 0 0 L 10 0', 6, 6)).toBe('');
  });

  const corners = (path: string) => flattenPath(path)[0];
});
