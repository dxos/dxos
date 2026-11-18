//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parseTracks, solveGrids } from './grid.ts';
import { type Box } from './shape.ts';

const box = (id: string, rest: Partial<Box> = {}): Box =>
  ({ kind: 'rect', id, x: 0, y: 0, w: 0, h: 0, ...rest }) as Box;

const grid = (id: string, rest: Partial<Box> = {}): Box => box(id, { kind: 'grid', ...rest });

describe('grid tracks', () => {
  test('a count is that many equal shares, and a list says what it says', ({ expect }) => {
    expect(parseTracks(3)).toEqual([
      { kind: 'fr', value: 1 },
      { kind: 'fr', value: 1 },
      { kind: 'fr', value: 1 },
    ]);
    expect(parseTracks('1fr auto 2fr 120')).toEqual([
      { kind: 'fr', value: 1 },
      { kind: 'auto' },
      { kind: 'fr', value: 2 },
      { kind: 'fixed', value: 120 },
    ]);
    // An axis that states nothing has implicit tracks, which only the children can count.
    expect(parseTracks(undefined)).toBeUndefined();
    // Anything that means nothing is one share: a typo spreads rather than collapsing the grid.
    expect(parseTracks('wat')).toEqual([{ kind: 'fr', value: 1 }]);
  });
});

describe('implicit tracks', () => {
  test('a grid that states nothing is a column, one row per child', ({ expect }) => {
    // What `flex flex-col gap-3` gives in Tailwind, and `grid-auto-rows` in CSS: the count IS the child count.
    const frames = solveGrids([
      grid('stack', { x: 0, y: 0, w: 100, h: 300, gap: 0 }),
      box('a', { parent: 'stack' }),
      box('b', { parent: 'stack' }),
      box('c', { parent: 'stack' }),
    ]);
    expect(frames.get('a')).toEqual({ x: 0, y: 0, w: 100, h: 100 });
    expect(frames.get('b')).toEqual({ x: 0, y: 100, w: 100, h: 100 });
    expect(frames.get('c')).toEqual({ x: 0, y: 200, w: 100, h: 100 });
  });

  test('stated columns give implicit rows, and stated rows give implicit columns', ({ expect }) => {
    const down = solveGrids([
      grid('g', { x: 0, y: 0, w: 200, h: 200, cols: 2 }),
      box('a', { parent: 'g' }),
      box('b', { parent: 'g' }),
      box('c', { parent: 'g' }),
    ]);
    // Three children over two columns need two rows, and nothing had to say so.
    expect(down.get('c')).toEqual({ x: 0, y: 100, w: 100, h: 100 });

    const across = solveGrids([
      grid('g', { x: 0, y: 0, w: 300, h: 100, rows: 1 }),
      box('a', { parent: 'g' }),
      box('b', { parent: 'g' }),
      box('c', { parent: 'g' }),
    ]);
    expect(across.get('c')).toEqual({ x: 200, y: 0, w: 100, h: 100 });
  });
});

describe('grids', () => {
  test('three equal columns, with the gap and padding taken off first', ({ expect }) => {
    const frames = solveGrids([
      grid('root', { x: 0, y: 0, w: 320, h: 100, cols: 3, gap: 10, padding: 10 }),
      box('a', { parent: 'root' }),
      box('b', { parent: 'root' }),
      box('c', { parent: 'root' }),
    ]);
    // 320 less 2×10 padding is 300, less 2×10 of gaps is 280, three ways.
    expect(frames.get('a')).toEqual({ x: 10, y: 10, w: 280 / 3, h: 80 });
    expect(frames.get('b')?.x).toBeCloseTo(10 + 280 / 3 + 10, 9);
    expect(frames.get('c')?.x).toBeCloseTo(10 + 2 * (280 / 3 + 10), 9);
  });

  test('an auto row keeps the content its own size, and fr takes what is left', ({ expect }) => {
    const frames = solveGrids([
      grid('col', { x: 0, y: 0, w: 100, h: 400, rows: 'auto 1fr', gap: 0 }),
      box('label', { h: 40, parent: 'col' }),
      box('body', { parent: 'col' }),
    ]);
    expect(frames.get('label')).toEqual({ x: 0, y: 0, w: 100, h: 40 });
    expect(frames.get('body')).toEqual({ x: 0, y: 40, w: 100, h: 360 });
  });

  test('children flow row by row, and one past the last cell is left alone', ({ expect }) => {
    const frames = solveGrids([
      grid('g', { x: 0, y: 0, w: 200, h: 200, cols: 2, rows: 2 }),
      box('one', { parent: 'g' }),
      box('two', { parent: 'g' }),
      box('three', { parent: 'g' }),
      box('four', { parent: 'g' }),
      box('five', { x: 7, y: 7, w: 1, h: 1, parent: 'g' }),
    ]);
    expect(frames.get('one')).toEqual({ x: 0, y: 0, w: 100, h: 100 });
    expect(frames.get('two')).toEqual({ x: 100, y: 0, w: 100, h: 100 });
    expect(frames.get('three')).toEqual({ x: 0, y: 100, w: 100, h: 100 });
    expect(frames.get('four')).toEqual({ x: 100, y: 100, w: 100, h: 100 });
    // Overflowing a stated grid would hide the mistake, so the extra child keeps its own frame.
    expect(frames.get('five')).toEqual({ x: 7, y: 7, w: 1, h: 1 });
  });

  test('a grid nested in another is solved inside the frame it was given', ({ expect }) => {
    const frames = solveGrids([
      grid('root', { x: 0, y: 0, w: 200, h: 200, cols: 2 }),
      grid('left', { rows: 2, parent: 'root' }),
      box('right', { parent: 'root' }),
      box('top', { parent: 'left' }),
      box('bottom', { parent: 'left' }),
    ]);
    expect(frames.get('left')).toEqual({ x: 0, y: 0, w: 100, h: 200 });
    expect(frames.get('top')).toEqual({ x: 0, y: 0, w: 100, h: 100 });
    expect(frames.get('bottom')).toEqual({ x: 0, y: 100, w: 100, h: 100 });
  });

  test('a parent that names no grid leaves its child alone, and a cycle never loops', ({ expect }) => {
    const frames = solveGrids([
      box('a', { x: 5, y: 6, w: 10, h: 10, parent: 'nobody' }),
      grid('loop', { x: 0, y: 0, w: 100, h: 100, parent: 'inner' }),
      grid('inner', { parent: 'loop' }),
    ]);
    expect(frames.get('a')).toEqual({ x: 5, y: 6, w: 10, h: 10 });
    expect(frames.get('loop')?.w).toEqual(100);
  });
});

describe('cell size and where the run sits', () => {
  test('autoRows gives every implicit row that extent, whatever the neighbour holds', ({ expect }) => {
    // CSS's `grid-auto-rows`: the cell size stops depending on how many cells there are, so a column of two and a
    // column of four draw cards the same height.
    const frames = solveGrids([
      grid('slide', { x: 0, y: 0, w: 400, h: 300, cols: 2, gap: 0 }),
      grid('left', { parent: 'slide', gap: 0, autoRows: 60 }),
      grid('right', { parent: 'slide', gap: 0, autoRows: 60 }),
      box('a', { parent: 'left' }),
      box('b', { parent: 'left' }),
      box('c', { parent: 'right' }),
      box('d', { parent: 'right' }),
      box('e', { parent: 'right' }),
    ]);
    expect(frames.get('a')).toEqual({ x: 0, y: 0, w: 200, h: 60 });
    expect(frames.get('c')).toEqual({ x: 200, y: 0, w: 200, h: 60 });
    expect(frames.get('e')).toEqual({ x: 200, y: 120, w: 200, h: 60 });
  });

  test('alignContent puts the space the tracks leave over on the side it names', ({ expect }) => {
    const rule = { x: 0, y: 0, w: 100, h: 300, gap: 0, autoRows: 50 };
    const centred = solveGrids([
      grid('g', { ...rule, alignContent: 'center' }),
      box('a', { parent: 'g' }),
      box('b', { parent: 'g' }),
    ]);
    // Two 50-tall rows in 300 leave 200 over; centred, half of it sits above them.
    expect(centred.get('a')).toEqual({ x: 0, y: 100, w: 100, h: 50 });
    expect(centred.get('b')).toEqual({ x: 0, y: 150, w: 100, h: 50 });

    const end = solveGrids([grid('g', { ...rule, alignContent: 'end' }), box('a', { parent: 'g' })]);
    expect(end.get('a')).toEqual({ x: 0, y: 250, w: 100, h: 50 });

    // An axis whose tracks take everything has nothing over, so it is where it always was.
    const full = solveGrids([
      grid('g', { ...rule, autoRows: undefined, alignContent: 'center' }),
      box('a', { parent: 'g' }),
    ]);
    expect(full.get('a')).toEqual({ x: 0, y: 0, w: 100, h: 300 });
  });

  test('justifyContent does the same across, and padding is still taken off first', ({ expect }) => {
    const frames = solveGrids([
      grid('g', { x: 0, y: 0, w: 300, h: 100, gap: 0, padding: 20, rows: 1, autoCols: 100, justifyContent: 'center' }),
      box('a', { parent: 'g' }),
    ]);
    // 260 wide inside the padding, one 100-wide column: 80 either side of it.
    expect(frames.get('a')).toEqual({ x: 100, y: 20, w: 100, h: 60 });
  });
});
