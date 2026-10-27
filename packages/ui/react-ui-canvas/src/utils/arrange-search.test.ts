//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { improveSlots, routeCost } from './arrange-search.ts';
import { type Slot } from './arrange.ts';

describe('routeCost', () => {
  test('counts crossings, bends and length', ({ expect }) => {
    const cost = routeCost([
      [
        { x: 0, y: 5 },
        { x: 10, y: 5 },
      ],
      [
        { x: 5, y: 0 },
        { x: 5, y: 10 },
        { x: 8, y: 10 },
      ],
    ]);
    expect(cost).toEqual({ crossings: 1, bends: 1, length: 23 });
  });

  test('touching ends and shared runs are not crossings', ({ expect }) => {
    const cost = routeCost([
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      [
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
      [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
      ],
    ]);
    expect(cost.crossings).toBe(0);
  });
});

describe('improveSlots', () => {
  test('moves a node next to its neighbour when that lowers the score', ({ expect }) => {
    const seed = new Map<string, Slot>([
      ['a', { column: 0, row: 0 }],
      ['b', { column: 3, row: 0 }],
    ]);
    const distance = (slots: ReadonlyMap<string, Slot>) => {
      const [a, b] = [slots.get('a'), slots.get('b')];
      return a && b ? Math.abs(a.column - b.column) + Math.abs(a.row - b.row) : Infinity;
    };
    const slots = improveSlots(seed, distance, { passes: 8 });
    expect(distance(slots)).toBe(1);
    expect(Math.min(...[...slots.values()].map(({ column }) => column))).toBe(0);
  });

  test('keeps the seed when nothing scores better', ({ expect }) => {
    const seed = new Map<string, Slot>([['a', { column: 0, row: 0 }]]);
    expect(improveSlots(seed, () => 0)).toEqual(seed);
  });
});
