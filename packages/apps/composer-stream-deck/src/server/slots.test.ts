//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { assignSlots, slotOf } from './slots.ts';

const at = (column: number, row = 0) => ({ coordinates: { column, row } });

describe('assignSlots', () => {
  test('orders by row then column', ({ expect }) => {
    const a = at(2, 0);
    const b = at(0, 1);
    const c = at(0, 0);
    expect(assignSlots([a, b, c])).toEqual([c, a, b]);
  });

  test('drops instances with no coordinates', ({ expect }) => {
    const placed = at(1);
    expect(assignSlots([{ coordinates: undefined }, placed])).toEqual([placed]);
  });

  test('is stable for an empty set', ({ expect }) => {
    expect(assignSlots([])).toEqual([]);
  });
});

describe('slotOf', () => {
  test('reports the reading-order index', ({ expect }) => {
    const first = at(0, 0);
    const second = at(1, 0);
    const third = at(0, 1);
    const instances = [third, second, first];
    expect(slotOf(instances, first)).toBe(0);
    expect(slotOf(instances, second)).toBe(1);
    expect(slotOf(instances, third)).toBe(2);
  });

  test('reports -1 for an unplaced instance', ({ expect }) => {
    const unplaced = { coordinates: undefined };
    expect(slotOf([at(0), unplaced], unplaced)).toBe(-1);
  });
});
