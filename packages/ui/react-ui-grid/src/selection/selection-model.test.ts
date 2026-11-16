//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, expect, test } from 'vitest';

import { type GridAddressing, GridSelectionModel, toRange, toSelection } from './selection-model.ts';

/** A grid whose `grid` plane shows `rows` by `cols`, in order. */
const createAddressing = (rows: string[], cols: string[]): GridAddressing => ({
  toId: ({ plane, col, row }) =>
    plane === 'grid' && cols[col] && rows[row] ? { col: cols[col], row: rows[row] } : undefined,
  toPosition: ({ col, row }) => {
    const position = { plane: 'grid' as const, col: cols.indexOf(col), row: rows.indexOf(row) };
    return position.col >= 0 && position.row >= 0 ? position : undefined;
  },
});

const range = (start: [number, number], end = start) => ({
  start: { plane: 'grid' as const, col: start[0], row: start[1] },
  end: { plane: 'grid' as const, col: end[0], row: end[1] },
});

describe('GridSelectionModel', () => {
  test('a selection names its cells by identity', ({ expect }) => {
    const addressing = createAddressing(['r1', 'r2', 'r3'], ['a', 'b']);
    expect(toSelection(addressing, range([0, 1], [1, 2]))).toEqual({
      anchor: { col: 'a', row: 'r2' },
      head: { col: 'b', row: 'r3' },
    });
    expect(toSelection(addressing, { ...range([0, 0]), start: { plane: 'frozenRowsStart', col: 0, row: 0 } })).toBe(
      undefined,
    );
  });

  test('a selection follows its rows when they are sorted, filtered or inserted above', ({ expect }) => {
    const selection = toSelection(createAddressing(['r1', 'r2', 'r3'], ['a', 'b']), range([1, 0]))!;
    expect(toRange(createAddressing(['r3', 'r2', 'r1'], ['a', 'b']), selection)).toEqual(range([1, 2]));
    expect(toRange(createAddressing(['r0', 'r1', 'r2', 'r3'], ['a', 'b']), selection)).toEqual(range([1, 1]));
    expect(toRange(createAddressing(['r1', 'r3'], ['b', 'a']), selection)).toEqual(range([0, 0]));
    expect(toRange(createAddressing(['r2', 'r3'], ['a', 'b']), selection)).toBe(undefined);
  });

  test('the local selection changes only when its cells do', ({ expect }) => {
    const model = new GridSelectionModel(Registry.make());
    const addressing = createAddressing(['r1', 'r2'], ['a', 'b']);

    model.select(toSelection(addressing, range([0, 0], [1, 1])));
    const selection = model.getLocal();
    model.select(toSelection(addressing, range([0, 0], [1, 1])));
    expect(model.getLocal()).toBe(selection);
    model.select(toSelection(addressing, range([0, 0])));
    expect(model.getLocal()).toEqual({ anchor: { col: 'a', row: 'r1' }, head: { col: 'a', row: 'r1' } });
    model.select(undefined);
    expect(model.getLocal()).toBe(undefined);
  });

  test('peers resolve to labelled ranges, leaving out those that no longer resolve', () => {
    const model = new GridSelectionModel(Registry.make());
    const before = createAddressing(['r1', 'r2', 'r3'], ['a', 'b']);
    model.setPeers([
      { peerId: 'p1', name: 'Alice', color: 'red', selection: toSelection(before, range([0, 0], [1, 1]))! },
      { peerId: 'p2', name: 'Bob', color: 'blue', selection: toSelection(before, range([1, 2]))! },
    ]);

    const after = createAddressing(['r2', 'r1'], ['a', 'b']);
    expect(model.resolvePeers(after)).toEqual([
      { id: 'p1', label: 'Alice', color: 'red', textColor: undefined, ...range([0, 1], [1, 0]) },
    ]);
  });
});
