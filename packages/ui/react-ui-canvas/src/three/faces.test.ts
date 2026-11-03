//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { facePoints, faceStops, flushWith, snapSides } from './faces.ts';

describe('faceStops', () => {
  test("the moves along an axis that bring a moving side onto each of another box's two sides", () => {
    const boxes = { b: { min: { x: 2, y: 0, z: 0 }, max: { x: 3, y: 1, z: 1 } } };
    // A unit body spanning x 0..1: its high side meets b's low side after 1, its low side b's high side after 3.
    const stops = faceStops([0, 1], boxes, 'x');
    expect(stops).toContainEqual({ delta: 1, face: { key: 'b', normal: { x: -1, y: 0, z: 0 } } });
    expect(stops).toContainEqual({ delta: 3, face: { key: 'b', normal: { x: 1, y: 0, z: 0 } } });
    expect(stops).toHaveLength(4);
  });

  test("a side within the detent of another box's side lands flush on it, ahead of the grid; else the grid holds the low side", () => {
    const boxes = { b: { min: { x: 2.1, y: 0, z: 0 }, max: { x: 3, y: 1, z: 1 } } };
    const at = (lo: number, landing = false) =>
      snapSides({ sides: [lo, lo + 1], axis: 'x', boxes, step: 0.25, detent: 0.06, landing });
    // The high side at 2.05 is 0.05 short of b's low side: it closes the gap rather than going to the grid line at 2.
    expect(at(1.05)).toEqual({ delta: expect.closeTo(0.05), face: { key: 'b', normal: { x: -1, y: 0, z: 0 } } });
    expect(at(1.05, true).face?.key).toBe('b');
    // Nothing near: the low side is held on a grid line within the detent, and lands on the nearest.
    expect(at(0.53)).toEqual({ delta: expect.closeTo(-0.03) });
    expect(at(0.6)).toEqual({ delta: 0 });
    expect(at(0.6, true)).toEqual({ delta: expect.closeTo(-0.1) });
    // Without a grid only the faces hold it.
    expect(snapSides({ sides: [0.6, 1.6], axis: 'x', boxes, step: 0, detent: 0.06 })).toEqual({ delta: 0 });
  });

  test('the sides of other boxes a face lies on, to show what it has snapped to', () => {
    const boxes = {
      b: { min: { x: 2, y: 0, z: 0 }, max: { x: 3, y: 1, z: 1 } },
      c: { min: { x: -1, y: 0, z: 0 }, max: { x: 2, y: 1, z: 1 } },
    };
    expect(flushWith([2], boxes, 'x')).toEqual([
      { key: 'b', normal: { x: -1, y: 0, z: 0 } },
      { key: 'c', normal: { x: 1, y: 0, z: 0 } },
    ]);
    expect(flushWith([2.5], boxes, 'x')).toEqual([]);
  });

  test("a face's points to snap to: its corners, the middles of its edges, and its centre, all on that side", () => {
    const box = { min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 4, z: 6 } };
    const points = facePoints(box, { x: 0, y: 1, z: 0 });
    expect(points).toHaveLength(9);
    expect(new Set(points.map(({ y }) => y))).toEqual(new Set([4]));
    expect(points).toContainEqual({ x: 0, y: 4, z: 0 });
    expect(points).toContainEqual({ x: 2, y: 4, z: 6 });
    expect(points).toContainEqual({ x: 1, y: 4, z: 0 });
    expect(points).toContainEqual({ x: 1, y: 4, z: 3 });
    expect(facePoints(box, { x: -1, y: 0, z: 0 })).toContainEqual({ x: 0, y: 2, z: 6 });
  });
});
