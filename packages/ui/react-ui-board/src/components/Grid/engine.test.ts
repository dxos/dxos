//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  type GridPosition,
  type Layout,
  type ResolveOptions,
  applyConstraints,
  compact,
  overlaps,
  pushToFit,
  rejectIfNoFit,
  resizeToFit,
  resolveCollisions,
} from './engine';

const pos = (x: number, y: number, w = 1, h = 1): GridPosition => ({ x, y, w, h });
const layout = (items: Record<string, GridPosition>): Layout => ({ items });
const cell = (id: string, x: number, y: number, w: number, h: number) => ({ id, x, y, w, h });
const opts = (columns: number, mode: ResolveOptions['mode'] = 'float'): ResolveOptions => ({
  bounds: { columns },
  mode,
});

describe('overlaps', () => {
  test('overlapping rectangles', ({ expect }) => {
    expect(overlaps(cell('a', 0, 0, 2, 2), cell('b', 1, 1, 2, 2))).toBe(true);
  });

  test('disjoint rectangles', ({ expect }) => {
    expect(overlaps(cell('a', 0, 0, 1, 1), cell('b', 5, 5, 1, 1))).toBe(false);
  });

  test('edge-adjacent horizontally is not an overlap', ({ expect }) => {
    expect(overlaps(cell('a', 0, 0, 1, 1), cell('b', 1, 0, 1, 1))).toBe(false);
  });

  test('edge-adjacent vertically is not an overlap', ({ expect }) => {
    expect(overlaps(cell('a', 0, 0, 1, 1), cell('b', 0, 1, 1, 1))).toBe(false);
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

describe('pushToFit (move)', () => {
  test('moving onto an empty cell leaves other items unchanged (float)', ({ expect }) => {
    const before = layout({ a: pos(0, 0), b: pos(2, 2) });
    const after = pushToFit(before, 'a', pos(3, 3), opts(4))!;
    expect(after.items.a).toEqual(pos(3, 3));
    expect(after.items.b).toEqual(pos(2, 2));
  });

  test('moving onto an occupied cell pushes the occupant down by exactly the overlap (float)', ({ expect }) => {
    const before = layout({ a: pos(0, 0, 2, 2), b: pos(0, 2, 2, 2) });
    const after = pushToFit(before, 'a', pos(0, 1, 2, 2), opts(4))!;
    expect(after.items.a).toEqual(pos(0, 1, 2, 2));
    expect(after.items.b).toEqual(pos(0, 3, 2, 2));
  });

  test('cascade push: moving A onto B pushes B onto C', ({ expect }) => {
    const before = layout({ a: pos(0, 0), b: pos(0, 1), c: pos(0, 2) });
    const after = pushToFit(before, 'a', pos(0, 1), opts(4))!;
    expect(after.items.a).toEqual(pos(0, 1));
    expect(after.items.b).toEqual(pos(0, 2));
    expect(after.items.c).toEqual(pos(0, 3));
  });

  test('clamps x past the right edge on drop', ({ expect }) => {
    const before = layout({ a: pos(0, 0, 2, 1) });
    const after = pushToFit(before, 'a', pos(10, 0, 2, 1), opts(4))!;
    expect(after.items.a).toEqual(pos(2, 0, 2, 1));
  });

  test('clamps negative x on drop', ({ expect }) => {
    const before = layout({ a: pos(0, 0, 2, 1) });
    const after = pushToFit(before, 'a', pos(-5, 0, 2, 1), opts(4))!;
    expect(after.items.a).toEqual(pos(0, 0, 2, 1));
  });

  test('pack compacts a gap left above an item; float leaves it', ({ expect }) => {
    const before = layout({ a: pos(0, 0), b: pos(0, 1) });

    const floated = pushToFit(before, 'b', pos(0, 5), opts(4, 'float'))!;
    expect(floated.items.a).toEqual(pos(0, 0));
    expect(floated.items.b).toEqual(pos(0, 5));

    const packed = pushToFit(before, 'b', pos(0, 5), opts(4, 'pack'))!;
    expect(packed.items.a).toEqual(pos(0, 0));
    expect(packed.items.b).toEqual(pos(0, 1));
  });

  test('unknown id returns the layout unchanged', ({ expect }) => {
    const before = layout({ a: pos(0, 0) });
    const after = pushToFit(before, 'missing', pos(2, 2), opts(4));
    expect(after).toEqual(before);
  });
});

describe('pushToFit (resize)', () => {
  test('resizing larger downward pushes the item directly below', ({ expect }) => {
    const before = layout({ a: pos(0, 0), b: pos(0, 1) });
    const after = pushToFit(before, 'a', pos(0, 0, 1, 2), opts(4))!;
    expect(after.items.a).toEqual(pos(0, 0, 1, 2));
    expect(after.items.b).toEqual(pos(0, 2));
  });

  test('cannot resize below minW/minH (constraints)', ({ expect }) => {
    const before = layout({ a: pos(0, 0, 2, 2) });
    const after = pushToFit(before, 'a', pos(0, 0, 1, 1), {
      bounds: { columns: 4 },
      constraints: { minW: 2, minH: 2 },
    })!;
    expect(after.items.a).toEqual(pos(0, 0, 2, 2));
  });

  test('cannot resize above maxW/maxH (constraints)', ({ expect }) => {
    const before = layout({ a: pos(0, 0) });
    const after = pushToFit(before, 'a', pos(0, 0, 10, 10), {
      bounds: { columns: 4 },
      constraints: { maxW: 3, maxH: 2 },
    })!;
    expect(after.items.a).toEqual(pos(0, 0, 3, 2));
  });

  test('resizing wider pushes the neighbour right', ({ expect }) => {
    const before = layout({ a: pos(0, 0), b: pos(1, 0, 2, 1) });
    const after = pushToFit(before, 'a', pos(0, 0, 2, 1), opts(8))!;
    expect(after.items.a).toEqual(pos(0, 0, 2, 1));
    expect(after.items.b).toEqual(pos(2, 0, 2, 1));
  });
});

describe('pushToFit (directional push)', () => {
  test('moving a tile rightward onto its neighbour pushes the neighbour right', ({ expect }) => {
    const before = layout({ a: pos(0, 0, 2, 2), b: pos(2, 0, 2, 2) });
    const after = pushToFit(before, 'a', pos(2, 0, 2, 2), opts(8))!;
    expect(after.items.a).toEqual(pos(2, 0, 2, 2));
    expect(after.items.b).toEqual(pos(4, 0, 2, 2));
  });

  test('rightward push falls back to down when it would overflow the columns', ({ expect }) => {
    const before = layout({ a: pos(0, 0, 2, 2), b: pos(2, 0, 2, 2) });
    const after = pushToFit(before, 'a', pos(2, 0, 2, 2), opts(4))!;
    expect(after.items.b).toEqual(pos(2, 2, 2, 2));
  });
});

describe('resizeToFit', () => {
  test('shrinks the dropped tile until it no longer overlaps a neighbour', ({ expect }) => {
    const before = layout({ a: pos(0, 0), b: pos(2, 0) });
    const after = resizeToFit(before, 'a', pos(0, 0, 4, 1), opts(8))!;
    // a would span x 0..4 and hit b at x=2, so it shrinks to w=2 (x 0..2, edge-adjacent to b).
    expect(after.items.a).toEqual(pos(0, 0, 2, 1));
    expect(after.items.b).toEqual(pos(2, 0));
  });

  test('rejects when not even a 1x1 fits at the target', ({ expect }) => {
    const before = layout({ a: pos(0, 0), b: pos(2, 0) });
    const after = resizeToFit(before, 'a', pos(2, 0), opts(8));
    expect(after).toBeNull();
  });

  test('never moves other tiles', ({ expect }) => {
    const before = layout({ a: pos(0, 0), b: pos(3, 0), c: pos(5, 0) });
    const after = resizeToFit(before, 'a', pos(0, 0, 6, 1), opts(8))!;
    expect(after.items.b).toEqual(pos(3, 0));
    expect(after.items.c).toEqual(pos(5, 0));
  });
});

describe('rejectIfNoFit', () => {
  test('places when the footprint fits in free space', ({ expect }) => {
    const before = layout({ a: pos(0, 0), b: pos(2, 2) });
    const after = rejectIfNoFit(before, 'a', pos(5, 5), opts(8))!;
    expect(after.items.a).toEqual(pos(5, 5));
    expect(after.items.b).toEqual(pos(2, 2));
  });

  test('rejects when the footprint overlaps a neighbour', ({ expect }) => {
    const before = layout({ a: pos(0, 0), b: pos(2, 2) });
    const after = rejectIfNoFit(before, 'a', pos(2, 2), opts(8));
    expect(after).toBeNull();
  });

  test('rejects when the footprint spills past the columns', ({ expect }) => {
    const before = layout({ a: pos(0, 0, 2, 1) });
    const after = rejectIfNoFit(before, 'a', pos(3, 0, 2, 1), opts(4));
    expect(after).toBeNull();
  });
});

describe('resolveCollisions', () => {
  test('cascades pushes deterministically sorted by y then x', ({ expect }) => {
    const before = layout({ moved: pos(0, 0), x: pos(1, 0), y: pos(0, 0) });
    const after = resolveCollisions(before, 'moved');
    expect(after.items.x).toEqual(pos(1, 0));
    expect(after.items.y).toEqual(pos(0, 1));
  });
});

describe('compact', () => {
  test('pulls items upward, deterministically ordered by (y, x)', ({ expect }) => {
    const before = layout({ a: pos(0, 5), b: pos(0, 10) });
    const after = compact(before);
    expect(after.items.a).toEqual(pos(0, 0));
    expect(after.items.b).toEqual(pos(0, 1));
  });

  test('does not move items across different columns', ({ expect }) => {
    const before = layout({ a: pos(0, 5), b: pos(1, 3) });
    const after = compact(before);
    expect(after.items.a).toEqual(pos(0, 0));
    expect(after.items.b).toEqual(pos(1, 0));
  });
});

describe('purity and determinism', () => {
  const frozenLayout = (items: Record<string, GridPosition>): Layout => {
    const frozen = Object.fromEntries(Object.entries(items).map(([id, entry]) => [id, Object.freeze({ ...entry })]));
    return Object.freeze({ items: Object.freeze(frozen) }) as Layout;
  };

  test('does not mutate a frozen input layout', ({ expect }) => {
    const before = frozenLayout({ a: pos(0, 0), b: pos(0, 1) });
    const snapshot = JSON.parse(JSON.stringify(before));

    expect(() => pushToFit(before, 'a', pos(0, 1), opts(4, 'pack'))).not.toThrow();
    expect(() => resizeToFit(before, 'a', pos(0, 0, 2, 2), opts(4))).not.toThrow();
    expect(() => resolveCollisions(before, 'a')).not.toThrow();
    expect(() => compact(before)).not.toThrow();

    expect(before).toEqual(snapshot);
  });

  test('same inputs produce deep-equal outputs across repeated calls', ({ expect }) => {
    const before = layout({ a: pos(0, 0), b: pos(0, 1), c: pos(0, 2) });
    const first = pushToFit(before, 'a', pos(0, 1), opts(4, 'pack'));
    const second = pushToFit(before, 'a', pos(0, 1), opts(4, 'pack'));
    expect(first).toEqual(second);
  });
});
