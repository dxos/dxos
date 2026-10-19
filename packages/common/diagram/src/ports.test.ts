//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type PortPath, assign, keyOf } from './ports.ts';
import type * as Scene from './scene.ts';
import { GRID, type Rect, zRouter } from './uml-grid.ts';

const STEP = GRID / 2;

type Segment = readonly [Scene.Point, Scene.Point];

const segmentsOf = (points: readonly Scene.Point[]): Segment[] =>
  points.slice(1).map((end, index) => [points[index], end] as const);

/** Whether two orthogonal polylines cross at a point interior to a segment of each. */
const crosses = (first: readonly Scene.Point[], second: readonly Scene.Point[]) =>
  segmentsOf(first).some(([a0, a1]) =>
    segmentsOf(second).some(([b0, b1]) => {
      const [vertical, horizontal] =
        a0.x === a1.x
          ? [
              [a0, a1],
              [b0, b1],
            ]
          : [
              [b0, b1],
              [a0, a1],
            ];
      if (vertical[0].x !== vertical[1].x || horizontal[0].y !== horizontal[1].y) {
        return false;
      }
      const x = vertical[0].x;
      const y = horizontal[0].y;
      return (
        x > Math.min(horizontal[0].x, horizontal[1].x) &&
        x < Math.max(horizontal[0].x, horizontal[1].x) &&
        y > Math.min(vertical[0].y, vertical[1].y) &&
        y < Math.max(vertical[0].y, vertical[1].y)
      );
    }),
  );

describe('ports', () => {
  // One box above two targets that sit far apart below it, on its left and its right.
  const source: Rect = { x: 384, y: 0, w: 192, h: 96 };
  const left: Rect = { x: 0, y: 384, w: 192, h: 96 };
  const right: Rect = { x: 768, y: 384, w: 192, h: 96 };

  /**
   * Routes both edges off the bottom face as Zs whose cross runs sit at different heights, as two
   * routes that share a side do once the second steers off the first.
   */
  const routeBoth = (toLeft: number, toRight: number) => {
    const route = (target: Rect, start: number, offset: number) =>
      zRouter({
        relation: { from: 'source', to: target === left ? 'left' : 'right' },
        from: source,
        to: target,
        horizontal: false,
        offset,
        ports: { start, end: target.x + target.w / 2 },
      });
    return [route(left, toLeft, 0), route(right, toRight, 1)];
  };

  test('two edges leaving one side in crossed order are reordered so they no longer cross', ({ expect }) => {
    // Crossed: the edge to the left target leaves from the right of the side and vice versa.
    const crossed = routeBoth(source.x + source.w - STEP * 2, source.x + STEP * 2);
    expect(crossed.every((points) => points[0].y === source.y + source.h)).toBe(true);
    expect(crosses(crossed[0], crossed[1])).toBe(true);

    const paths: PortPath[] = [
      { points: crossed[0], source, target: left },
      { points: crossed[1], source, target: right },
    ];
    const [toLeft, toRight] = assign(paths, { step: STEP });
    expect(toLeft.start).toBeDefined();
    expect(toRight.start).toBeDefined();
    const [leftStart, rightStart] = [toLeft.start ?? 0, toRight.start ?? 0];
    expect(leftStart).toBeLessThan(rightStart);
    for (const coord of [leftStart, rightStart]) {
      expect(coord % STEP).toBe(0);
      expect(coord).toBeGreaterThanOrEqual(source.x + STEP);
      expect(coord).toBeLessThanOrEqual(source.x + source.w - STEP);
    }
    // The far ends were not asked to move.
    expect(toLeft.end).toBeUndefined();
    expect(toRight.end).toBeUndefined();

    const ordered = routeBoth(leftStart, rightStart);
    expect(crosses(ordered[0], ordered[1])).toBe(false);
  });

  test('a side already in order is left alone', ({ expect }) => {
    const ordered = routeBoth(source.x + STEP * 2, source.x + source.w - STEP * 2);
    expect(crosses(ordered[0], ordered[1])).toBe(false);
    const assigned = assign(
      [
        { points: ordered[0], source, target: left },
        { points: ordered[1], source, target: right },
      ],
      { step: STEP },
    );
    expect(assigned).toEqual([{}, {}]);
  });

  test('free ports are placed around a fixed one in key order', ({ expect }) => {
    const below: Rect = { x: 384, y: 384, w: 192, h: 96 };
    const center = source.x + source.w / 2;
    const straight = [
      { x: center, y: source.y + source.h },
      { x: center, y: below.y },
    ];
    // Both turning edges start left of the straight one, though one of them heads right.
    const turningRight = [
      { x: center - STEP, y: 96 },
      { x: center - STEP, y: 160 },
      { x: right.x + right.w / 2, y: 160 },
      { x: right.x + right.w / 2, y: right.y },
    ];
    const turningLeft = [
      { x: center - STEP * 2, y: 96 },
      { x: center - STEP * 2, y: 192 },
      { x: left.x + left.w / 2, y: 192 },
      { x: left.x + left.w / 2, y: left.y },
    ];
    const [first, second, third] = assign(
      [
        { points: straight, source, target: below, fixed: { start: true, end: true } },
        { points: turningRight, source, target: right },
        { points: turningLeft, source, target: left },
      ],
      { step: STEP },
    );
    expect(first).toEqual({});
    expect(second.start).toBeGreaterThanOrEqual(center + STEP);
    expect(third.start).toBeLessThanOrEqual(center - STEP);
  });

  test('keys order turning routes so neither turn-off cuts the other', ({ expect }) => {
    const out = (run: number, towards: number) => [
      { x: 0, y: 0 },
      { x: 0, y: run },
      { x: towards, y: run },
    ];
    // Of two routes turning to the high end, the one running out farther belongs nearer the low end.
    expect(keyOf(out(64, 100), 'bottom')).toBeLessThan(keyOf(out(32, 100), 'bottom'));
    // Of two turning to the low end, the one turning sooner belongs nearer the low end.
    expect(keyOf(out(32, -100), 'bottom')).toBeLessThan(keyOf(out(64, -100), 'bottom'));
    // A route that does not turn sits between the two fans.
    expect(keyOf(out(64, -100), 'bottom')).toBeLessThan(keyOf(out(64, 0).slice(0, 2), 'bottom'));
    expect(keyOf(out(64, 0).slice(0, 2), 'bottom')).toBeLessThan(keyOf(out(64, 100), 'bottom'));
  });
});
