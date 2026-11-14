//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Bounds, type Point, type Side } from '@dxos/scene';

import { orthoRoute } from './ortho-route.ts';
import { SIDES, sideNormal } from './ports.ts';
import { type RouteEnd } from './route.ts';

const STUB = 24;
const SIZE = 100;

const box = (x: number, y: number): Bounds => ({ x, y, width: SIZE, height: SIZE });

/** The end on the centre port of a side of a box. */
const port = (bounds: Bounds, side: Side): RouteEnd => {
  const normal = sideNormal(side);
  return {
    point: {
      x: bounds.x + (bounds.width / 2) * (1 + normal.x),
      y: bounds.y + (bounds.height / 2) * (1 + normal.y),
    },
    side,
    bounds,
  };
};

const route = (from: RouteEnd, to: RouteEnd): Point[] => orthoRoute(from, to, STUB) ?? [];

const bends = (points: readonly Point[]): number => points.length - 2;

/** Whether the segment between two points runs through the inside of a frame. */
const crosses = (left: Point, right: Point, { x, y, width, height }: Bounds): boolean =>
  Math.max(left.x, right.x) > x &&
  Math.min(left.x, right.x) < x + width &&
  Math.max(left.y, right.y) > y &&
  Math.min(left.y, right.y) < y + height;

describe('orthoRoute', () => {
  test('ports that face each other on one line join straight', ({ expect }) => {
    expect(route(port(box(0, 0), 'e'), port(box(200, 0), 'w'))).toEqual([
      { x: 100, y: 50 },
      { x: 200, y: 50 },
    ]);
    expect(route(port(box(0, 0), 's'), port(box(0, 200), 'n'))).toEqual([
      { x: 50, y: 100 },
      { x: 50, y: 200 },
    ]);
  });

  test('ports that face each other off one line step halfway between the shapes', ({ expect }) => {
    expect(route(port(box(0, 0), 'e'), port(box(200, 100), 'w'))).toEqual([
      { x: 100, y: 50 },
      { x: 150, y: 50 },
      { x: 150, y: 150 },
      { x: 200, y: 150 },
    ]);
  });

  test('sides that meet at a corner take one bend', ({ expect }) => {
    expect(route(port(box(0, 0), 'e'), port(box(200, 200), 'n'))).toEqual([
      { x: 100, y: 50 },
      { x: 250, y: 50 },
      { x: 250, y: 200 },
    ]);
  });

  test('a port on the far side of its shape is reached round the shape, never through it', ({ expect }) => {
    // The shape below and to the left, joined east side to east side: out past the target, up, and back in to it.
    expect(route(port(box(0, 300), 'e'), port(box(200, 0), 'e'))).toEqual([
      { x: 100, y: 350 },
      { x: 324, y: 350 },
      { x: 324, y: 50 },
      { x: 300, y: 50 },
    ]);
  });

  test('two ports on the same side of shapes in a row make a U a stub out', ({ expect }) => {
    expect(route(port(box(0, 0), 'n'), port(box(200, 0), 'n'))).toEqual([
      { x: 50, y: 0 },
      { x: 50, y: -24 },
      { x: 250, y: -24 },
      { x: 250, y: 0 },
    ]);
  });

  test('ports that face away from each other take four bends, crossing halfway between the shapes', ({ expect }) => {
    expect(route(port(box(300, 0), 'e'), port(box(0, 300), 'w'))).toEqual([
      { x: 400, y: 50 },
      { x: 424, y: 50 },
      { x: 424, y: 200 },
      { x: -24, y: 200 },
      { x: -24, y: 350 },
      { x: 0, y: 350 },
    ]);
    // In one row there is no gap to cross in, so the route goes round over or under both.
    const around = route(port(box(300, 0), 'e'), port(box(0, 0), 'w'));
    expect(bends(around)).toBe(4);
    expect(around[1]).toEqual({ x: 424, y: 50 });
    expect(around[4]).toEqual({ x: -24, y: 50 });
  });

  test('shapes closer than two stubs share the gap between them', ({ expect }) => {
    expect(route(port(box(0, 0), 'e'), port(box(110, 30), 'w'))).toEqual([
      { x: 100, y: 50 },
      { x: 105, y: 50 },
      { x: 105, y: 80 },
      { x: 110, y: 80 },
    ]);
  });

  test('ends with no frame still leave and arrive along their sides', ({ expect }) => {
    expect(orthoRoute({ point: { x: 0, y: 0 }, side: 'e' }, { point: { x: 100, y: 60 }, side: 'e' }, STUB)).toEqual([
      { x: 0, y: 0 },
      { x: 124, y: 0 },
      { x: 124, y: 60 },
      { x: 100, y: 60 },
    ]);
  });

  test('shapes that overlap have nothing between them to route through', ({ expect }) => {
    expect(orthoRoute(port(box(0, 0), 'e'), port(box(50, 50), 'w'), STUB)).toBeUndefined();
  });

  test('whichever sides and wherever the shapes stand, the route leaves and arrives square and crosses neither', ({
    expect,
  }) => {
    const source = box(0, 0);
    const offsets = [-260, -130, 0, 130, 260];
    for (const dx of offsets) {
      for (const dy of offsets) {
        if (dx === 0 && dy === 0) {
          continue;
        }
        const target = box(dx, dy);
        for (const fromSide of SIDES) {
          for (const toSide of SIDES) {
            const [from, to] = [port(source, fromSide), port(target, toSide)];
            const points = route(from, to);
            const name = `${fromSide}>${toSide} at ${dx},${dy}`;
            expect(points.length, name).toBeGreaterThanOrEqual(2);
            expect(bends(points), name).toBeLessThanOrEqual(4);
            for (let index = 1; index < points.length; index++) {
              const [left, right] = [points[index - 1], points[index]];
              // Every segment runs along one axis, and none is a point.
              expect(left.x === right.x || left.y === right.y, name).toBe(true);
              expect(left.x === right.x && left.y === right.y, name).toBe(false);
              expect(crosses(left, right, source) || crosses(left, right, target), name).toBe(false);
            }
            // The first segment runs out along the source side's normal, the last in against the target's.
            const [out, back] = [sideNormal(fromSide), sideNormal(toSide)];
            const [first, last] = [points[1], points[points.length - 2]];
            expect((first.x - from.point.x) * out.x + (first.y - from.point.y) * out.y, name).toBeGreaterThan(0);
            expect((last.x - to.point.x) * back.x + (last.y - to.point.y) * back.y, name).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});
