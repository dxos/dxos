//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { nudge } from './nudge.ts';
import type * as Scene from './scene.ts';
import { type Rect } from './uml-grid.ts';

const orthogonal = (points: readonly Scene.Point[]) =>
  points.slice(1).every((point, index) => point.x === points[index].x || point.y === points[index].y);

const onBorder = (point: Scene.Point, rect: Rect) =>
  ((point.y === rect.y || point.y === rect.y + rect.h) && point.x >= rect.x && point.x <= rect.x + rect.w) ||
  ((point.x === rect.x || point.x === rect.x + rect.w) && point.y >= rect.y && point.y <= rect.y + rect.h);

describe('nudge', () => {
  const source: Rect = { x: 0, y: 0, w: 128, h: 64 };
  const left: Rect = { x: 0, y: 200, w: 128, h: 64 };
  const right: Rect = { x: 200, y: 200, w: 128, h: 64 };
  // A fork: both leave the same port and run down x = 64 together before one turns right.
  const straight = {
    points: [
      { x: 64, y: 64 },
      { x: 64, y: 200 },
    ],
    source,
    target: left,
  };
  const turning = {
    points: [
      { x: 64, y: 64 },
      { x: 64, y: 132 },
      { x: 264, y: 132 },
      { x: 264, y: 200 },
    ],
    source,
    target: right,
  };

  test('two edges sharing a vertical run are separated and stay orthogonal', ({ expect }) => {
    const [first, second] = nudge([straight, turning], { obstacles: [source, left, right] });
    expect(orthogonal(first)).toBe(true);
    expect(orthogonal(second)).toBe(true);
    // The edge that turns right takes the right-hand lane, so its turn-off does not cut the other.
    expect(second[0].x - first[0].x).toBeGreaterThanOrEqual(8);
    expect(second[1].x).toBe(second[0].x);
    expect(onBorder(first[0], source) && onBorder(second[0], source)).toBe(true);
    expect(first[first.length - 1]).toEqual({ x: first[0].x, y: 200 });
    expect(second[second.length - 1]).toEqual({ x: 264, y: 200 });
  });

  test('a fixed bus never moves; the edge lying on it is pushed off', ({ expect }) => {
    const bus = [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ];
    const edge = {
      points: [
        { x: 64, y: 64 },
        { x: 64, y: 100 },
        { x: 264, y: 100 },
        { x: 264, y: 200 },
      ],
      source,
      target: right,
    };
    const fixed = [bus];
    const [moved] = nudge([edge], { obstacles: [source, right], fixed });
    expect(fixed[0]).toEqual(bus);
    expect(Math.abs(moved[1].y - 100)).toBeGreaterThanOrEqual(8);
    expect(moved[0]).toEqual({ x: 64, y: 64 });
    expect(orthogonal(moved)).toBe(true);
  });

  test('ports stay put when separation would leave the box side', ({ expect }) => {
    const narrow: Rect = { x: 0, y: 0, w: 16, h: 64 };
    const below: Rect = { x: 0, y: 200, w: 16, h: 64 };
    const path = {
      points: [
        { x: 8, y: 64 },
        { x: 8, y: 200 },
      ],
      source: narrow,
      target: below,
    };
    const result = nudge([path, path], { obstacles: [narrow, below] });
    expect(result).toEqual([path.points, path.points]);
  });

  test('a run is never pushed through a box', ({ expect }) => {
    // Both lanes beside the shared run are blocked by boxes hugging it.
    const wall = (x: number): Rect => ({ x, y: 80, w: 40, h: 100 });
    const edge = (y: number) => ({
      points: [
        { x: 64, y: 64 },
        { x: 64, y: 200 },
      ],
      source,
      target: { x: 0, y, w: 128, h: 64 },
    });
    const obstacles = [source, wall(20), wall(68), { x: 0, y: 200, w: 128, h: 64 }];
    const result = nudge([edge(200), edge(200)], { obstacles });
    expect(result.map((points) => points[0].x)).toEqual([64, 64]);
  });
});
