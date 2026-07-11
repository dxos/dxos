//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  GridItem,
  GridLayout,
  applyConstraints,
  clampToColumns,
  compact,
  moveItem,
  overlaps,
  resizeItem,
  resolveCollisions,
} from './engine';

const item = (id: string, x: number, y: number, w: number, h: number): GridItem => ({ id, x, y, w, h });

const layout = (columns: number, items: GridItem[]): GridLayout => ({ columns, items });

describe('overlaps', () => {
  test('overlapping rectangles', ({ expect }) => {
    expect(overlaps(item('a', 0, 0, 2, 2), item('b', 1, 1, 2, 2))).toBe(true);
  });

  test('disjoint rectangles', ({ expect }) => {
    expect(overlaps(item('a', 0, 0, 1, 1), item('b', 5, 5, 1, 1))).toBe(false);
  });

  test('edge-adjacent horizontally is not an overlap', ({ expect }) => {
    expect(overlaps(item('a', 0, 0, 1, 1), item('b', 1, 0, 1, 1))).toBe(false);
  });

  test('edge-adjacent vertically is not an overlap', ({ expect }) => {
    expect(overlaps(item('a', 0, 0, 1, 1), item('b', 0, 1, 1, 1))).toBe(false);
  });
});

describe('clampToColumns', () => {
  test('clamps x past the right edge so x + w <= columns', ({ expect }) => {
    expect(clampToColumns(item('a', 10, 0, 2, 1), 4)).toEqual(item('a', 2, 0, 2, 1));
  });

  test('clamps negative x to 0', ({ expect }) => {
    expect(clampToColumns(item('a', -5, 0, 2, 1), 4)).toEqual(item('a', 0, 0, 2, 1));
  });

  test('clamps w wider than columns down to columns', ({ expect }) => {
    expect(clampToColumns(item('a', 0, 0, 10, 1), 4)).toEqual(item('a', 0, 0, 4, 1));
  });
});

describe('applyConstraints', () => {
  test('defaults min to 1 and max to Infinity', ({ expect }) => {
    expect(applyConstraints({ w: 3, h: 3 })).toEqual({ w: 3, h: 3 });
    expect(applyConstraints({ w: 0, h: 0 })).toEqual({ w: 1, h: 1 });
  });

  test('clamps below minW/minH', ({ expect }) => {
    expect(applyConstraints({ w: 1, h: 1 }, { minW: 2, minH: 3 })).toEqual({ w: 2, h: 3 });
  });

  test('clamps above maxW/maxH', ({ expect }) => {
    expect(applyConstraints({ w: 10, h: 10 }, { maxW: 4, maxH: 5 })).toEqual({ w: 4, h: 5 });
  });

  test('never goes below 1 even with unusual constraints', ({ expect }) => {
    expect(applyConstraints({ w: -3, h: -3 })).toEqual({ w: 1, h: 1 });
  });
});

describe('moveItem', () => {
  test('moving onto an empty cell leaves other items unchanged (float)', ({ expect }) => {
    const before = layout(4, [item('a', 0, 0, 1, 1), item('b', 2, 2, 1, 1)]);
    const after = moveItem(before, 'a', { x: 3, y: 3 }, 'float');
    expect(after.items.find((entry) => entry.id === 'a')).toEqual(item('a', 3, 3, 1, 1));
    expect(after.items.find((entry) => entry.id === 'b')).toEqual(item('b', 2, 2, 1, 1));
  });

  test('moving onto an occupied cell pushes the occupant down by exactly the overlap (float)', ({ expect }) => {
    // "a" occupies rows 1-3 once moved; "b" occupies rows 2-4, overlapping rows 2-3 (1 row).
    const before = layout(4, [item('a', 0, 0, 2, 2), item('b', 0, 2, 2, 2)]);
    const after = moveItem(before, 'a', { x: 0, y: 1 }, 'float');
    expect(after.items.find((entry) => entry.id === 'a')).toEqual(item('a', 0, 1, 2, 2));
    // Pushed from y=2 to y=3: exactly the 1-row overlap, no further gap.
    expect(after.items.find((entry) => entry.id === 'b')).toEqual(item('b', 0, 3, 2, 2));
  });

  test('cascade push: moving A onto B pushes B onto C', ({ expect }) => {
    const before = layout(4, [item('a', 0, 0, 1, 1), item('b', 0, 1, 1, 1), item('c', 0, 2, 1, 1)]);
    const after = moveItem(before, 'a', { x: 0, y: 1 }, 'float');
    expect(after.items.find((entry) => entry.id === 'a')).toEqual(item('a', 0, 1, 1, 1));
    expect(after.items.find((entry) => entry.id === 'b')).toEqual(item('b', 0, 2, 1, 1));
    expect(after.items.find((entry) => entry.id === 'c')).toEqual(item('c', 0, 3, 1, 1));
  });

  test('clamps x past the right edge on drop', ({ expect }) => {
    const before = layout(4, [item('a', 0, 0, 2, 1)]);
    const after = moveItem(before, 'a', { x: 10, y: 0 }, 'float');
    expect(after.items[0]).toEqual(item('a', 2, 0, 2, 1));
  });

  test('clamps negative x on drop', ({ expect }) => {
    const before = layout(4, [item('a', 0, 0, 2, 1)]);
    const after = moveItem(before, 'a', { x: -5, y: 0 }, 'float');
    expect(after.items[0]).toEqual(item('a', 0, 0, 2, 1));
  });

  test('pack compacts a gap left above an item; float leaves it', ({ expect }) => {
    const before = layout(4, [item('a', 0, 0, 1, 1), item('b', 0, 1, 1, 1)]);

    const floated = moveItem(before, 'b', { x: 0, y: 5 }, 'float');
    expect(floated.items.find((entry) => entry.id === 'a')).toEqual(item('a', 0, 0, 1, 1));
    expect(floated.items.find((entry) => entry.id === 'b')).toEqual(item('b', 0, 5, 1, 1));

    const packed = moveItem(before, 'b', { x: 0, y: 5 }, 'pack');
    expect(packed.items.find((entry) => entry.id === 'a')).toEqual(item('a', 0, 0, 1, 1));
    expect(packed.items.find((entry) => entry.id === 'b')).toEqual(item('b', 0, 1, 1, 1));
  });

  test('dropping on the own current cell is a no-op', ({ expect }) => {
    const before = layout(4, [item('a', 0, 0, 1, 1), item('b', 1, 0, 1, 1)]);
    const after = moveItem(before, 'a', { x: 0, y: 0 }, 'float');
    expect(after).toEqual(before);
  });

  test('unknown id returns the layout unchanged', ({ expect }) => {
    const before = layout(4, [item('a', 0, 0, 1, 1)]);
    const after = moveItem(before, 'missing', { x: 2, y: 2 }, 'float');
    expect(after).toEqual(before);
  });
});

describe('resizeItem', () => {
  test('resizing larger downward pushes the item directly below', ({ expect }) => {
    const before = layout(4, [item('a', 0, 0, 1, 1), item('b', 0, 1, 1, 1)]);
    const after = resizeItem(before, 'a', { w: 1, h: 2 }, undefined, 'float');
    expect(after.items.find((entry) => entry.id === 'a')).toEqual(item('a', 0, 0, 1, 2));
    expect(after.items.find((entry) => entry.id === 'b')).toEqual(item('b', 0, 2, 1, 1));
  });

  test('cannot resize below minW/minH', ({ expect }) => {
    const before = layout(4, [item('a', 0, 0, 2, 2)]);
    const after = resizeItem(before, 'a', { w: 1, h: 1 }, { minW: 2, minH: 2 }, 'float');
    expect(after.items[0]).toEqual(item('a', 0, 0, 2, 2));
  });

  test('cannot resize above maxW/maxH', ({ expect }) => {
    const before = layout(4, [item('a', 0, 0, 1, 1)]);
    const after = resizeItem(before, 'a', { w: 10, h: 10 }, { maxW: 3, maxH: 2 }, 'float');
    expect(after.items[0]).toEqual(item('a', 0, 0, 3, 2));
  });

  test('pack compacts after a resize shrink leaves a gap above another item', ({ expect }) => {
    const before = layout(4, [item('a', 0, 0, 1, 2), item('b', 0, 2, 1, 1)]);

    const floated = resizeItem(before, 'a', { w: 1, h: 1 }, undefined, 'float');
    expect(floated.items.find((entry) => entry.id === 'b')).toEqual(item('b', 0, 2, 1, 1));

    const packed = resizeItem(before, 'a', { w: 1, h: 1 }, undefined, 'pack');
    expect(packed.items.find((entry) => entry.id === 'b')).toEqual(item('b', 0, 1, 1, 1));
  });

  test('growing width at the right edge caps w and keeps x fixed (does not shift left)', ({ expect }) => {
    const before = layout(6, [item('a', 2, 0, 1, 1)]);
    const after = resizeItem(before, 'a', { w: 5, h: 1 }, undefined, 'float');
    // x stays at 2; w capped at columns - x = 4 (not shifted to x=1, w=5).
    expect(after.items[0]).toEqual(item('a', 2, 0, 4, 1));
  });

  test('unknown id returns the layout unchanged', ({ expect }) => {
    const before = layout(4, [item('a', 0, 0, 1, 1)]);
    const after = resizeItem(before, 'missing', { w: 2, h: 2 }, undefined, 'float');
    expect(after).toEqual(before);
  });
});

describe('resolveCollisions', () => {
  test('cascades pushes deterministically sorted by y then x', ({ expect }) => {
    const before = layout(4, [item('moved', 0, 0, 1, 1), item('x', 1, 0, 1, 1), item('y', 0, 0, 1, 1)]);
    // Both "x" and "y" overlap the anchor at (0,0); only "y" (same cell) actually overlaps.
    const after = resolveCollisions(before, 'moved');
    expect(after.items.find((entry) => entry.id === 'x')).toEqual(item('x', 1, 0, 1, 1));
    expect(after.items.find((entry) => entry.id === 'y')).toEqual(item('y', 0, 1, 1, 1));
  });
});

describe('compact', () => {
  test('pulls items upward, deterministically ordered by (y, x)', ({ expect }) => {
    const before = layout(4, [item('a', 0, 5, 1, 1), item('b', 0, 10, 1, 1)]);
    const after = compact(before);
    expect(after.items.find((entry) => entry.id === 'a')).toEqual(item('a', 0, 0, 1, 1));
    expect(after.items.find((entry) => entry.id === 'b')).toEqual(item('b', 0, 1, 1, 1));
  });

  test('does not move items across different columns', ({ expect }) => {
    const before = layout(4, [item('a', 0, 5, 1, 1), item('b', 1, 3, 1, 1)]);
    const after = compact(before);
    expect(after.items.find((entry) => entry.id === 'a')).toEqual(item('a', 0, 0, 1, 1));
    expect(after.items.find((entry) => entry.id === 'b')).toEqual(item('b', 1, 0, 1, 1));
  });
});

describe('purity and determinism', () => {
  const frozenLayout = (columns: number, items: GridItem[]): GridLayout => {
    const frozenItems = items.map((entry) => Object.freeze({ ...entry }));
    return Object.freeze({ columns, items: Object.freeze(frozenItems) as GridItem[] }) as GridLayout;
  };

  test('does not mutate a frozen input layout', ({ expect }) => {
    const before = frozenLayout(4, [item('a', 0, 0, 1, 1), item('b', 0, 1, 1, 1)]);
    const snapshot = JSON.parse(JSON.stringify(before));

    expect(() => moveItem(before, 'a', { x: 0, y: 1 }, 'pack')).not.toThrow();
    expect(() => resizeItem(before, 'a', { w: 2, h: 2 }, undefined, 'pack')).not.toThrow();
    expect(() => resolveCollisions(before, 'a')).not.toThrow();
    expect(() => compact(before)).not.toThrow();

    expect(before).toEqual(snapshot);
  });

  test('same inputs produce deep-equal outputs across repeated calls', ({ expect }) => {
    const before = layout(4, [item('a', 0, 0, 1, 1), item('b', 0, 1, 1, 1), item('c', 0, 2, 1, 1)]);
    const first = moveItem(before, 'a', { x: 0, y: 1 }, 'pack');
    const second = moveItem(before, 'a', { x: 0, y: 1 }, 'pack');
    expect(first).toEqual(second);
  });
});
