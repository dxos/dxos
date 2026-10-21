//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ArrangeEdge, type Slot, arrange } from './arrange.ts';

// Two rows whose id order crosses every edge: a→z, b→y, c→x.
const ranks = new Map([
  ['a', 0],
  ['b', 0],
  ['c', 0],
  ['x', 1],
  ['y', 1],
  ['z', 1],
]);
const edges: ArrangeEdge[] = [
  { from: 'a', to: 'z' },
  { from: 'b', to: 'y' },
  { from: 'c', to: 'x' },
];

const crossings = (slots: ReadonlyMap<string, Slot>) => {
  const columns = edges.map(({ from, to }) => [slots.get(from)?.column ?? 0, slots.get(to)?.column ?? 0]);
  let count = 0;
  for (let i = 0; i < columns.length; i++) {
    for (let j = i + 1; j < columns.length; j++) {
      count += (columns[i][0] - columns[j][0]) * (columns[i][1] - columns[j][1]) < 0 ? 1 : 0;
    }
  }
  return count;
};

describe('arrange', () => {
  test('rank orders each row by id', ({ expect }) => {
    const slots = arrange(ranks, edges, 'rank');
    expect(slots.get('a')).toEqual({ column: 0, row: 0 });
    expect(slots.get('x')).toEqual({ column: 0, row: 1 });
    expect(crossings(slots)).toBe(3);
  });

  test('crossings reorders rows so no edges cross', ({ expect }) => {
    const slots = arrange(ranks, edges, 'crossings');
    expect(crossings(slots)).toBe(0);
    expect([...slots.values()].map(({ row }) => row).sort()).toEqual([0, 0, 0, 1, 1, 1]);
  });

  test('force gives every node its own slot, the same every time', ({ expect }) => {
    const slots = arrange(ranks, edges, 'force');
    const keys = [...slots.values()].map(({ column, row }) => `${column},${row}`);
    expect(new Set(keys).size).toBe(ranks.size);
    expect(arrange(ranks, edges, 'force')).toEqual(slots);
    expect(Math.min(...[...slots.values()].map(({ column }) => column))).toBe(0);
  });
});
