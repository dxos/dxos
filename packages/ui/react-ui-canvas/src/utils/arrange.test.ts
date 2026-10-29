//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ArrangeEdge, type Slot, arrange } from './arrange.ts';

// Two rows whose id order crosses every edge: a->z, b->y, c->x.
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

  test('crossings never has more crossings than the rank order it starts from', ({ expect }) => {
    // A small deterministic generator, so the graphs are varied but the test is repeatable.
    let state = 1;
    const random = () => (state = (state * 48271) % 2147483647) / 2147483647;
    for (let graph = 0; graph < 2000; graph++) {
      const ranks = new Map<string, number>();
      const rows = Array.from({ length: 4 }, (_, row) =>
        Array.from({ length: 2 + Math.floor(random() * 6) }, (_, column) => `${row}-${column}`),
      );
      rows.forEach((row, rank) => row.forEach((id) => ranks.set(id, rank)));
      const graphEdges: ArrangeEdge[] = rows
        .slice(1)
        .flatMap((row, index) =>
          rows[index].flatMap((from) => row.filter(() => random() < 0.4).map((to) => ({ from, to }))),
        );
      const count = (slots: ReadonlyMap<string, Slot>) => {
        const pairs = graphEdges.map(({ from, to }) => [slots.get(from)?.column ?? 0, slots.get(to)?.column ?? 0]);
        let total = 0;
        for (let i = 0; i < pairs.length; i++) {
          for (let j = i + 1; j < pairs.length; j++) {
            const sameRows = (slots.get(graphEdges[i].from)?.row ?? 0) === (slots.get(graphEdges[j].from)?.row ?? 0);
            total += sameRows && (pairs[i][0] - pairs[j][0]) * (pairs[i][1] - pairs[j][1]) < 0 ? 1 : 0;
          }
        }
        return total;
      };
      expect(count(arrange(ranks, graphEdges, 'crossings'))).toBeLessThanOrEqual(
        count(arrange(ranks, graphEdges, 'rank')),
      );
    }
  });

  test('force gives every node its own slot, the same every time', ({ expect }) => {
    const slots = arrange(ranks, edges, 'force');
    const keys = [...slots.values()].map(({ column, row }) => `${column},${row}`);
    expect(new Set(keys).size).toBe(ranks.size);
    expect(arrange(ranks, edges, 'force')).toEqual(slots);
    expect(Math.min(...[...slots.values()].map(({ column }) => column))).toBe(0);
  });
});
