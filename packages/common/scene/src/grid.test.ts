//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parseTracks, solveGrid, solveGrids } from './grid.ts';
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

describe('a box that packs what it holds', () => {
  test('gives each child the square its circle fits, inside the padding', ({ expect }) => {
    const rule = { layout: 'pack' as const, packSeed: 7, packMin: 40, packMax: 40, gap: 8, padding: 16 };
    const placed = solveGrid(rule, { x: 100, y: 200, w: 400, h: 400 }, [box('a'), box('b'), box('c')]);
    expect(placed).toHaveLength(3);
    for (const { frame } of placed) {
      expect([frame.w, frame.h]).toEqual([80, 80]);
      // Inside the frame, and clear of its edge by the gap: the packing samples within that margin.
      expect(frame.x).toBeGreaterThanOrEqual(100 + 16 + 8);
      expect(frame.y).toBeGreaterThanOrEqual(200 + 16 + 8);
      expect(frame.x + frame.w).toBeLessThanOrEqual(100 + 400 - 16 - 8);
      expect(frame.y + frame.h).toBeLessThanOrEqual(200 + 400 - 16 - 8);
    }
    // No two overlap, which is the whole job.
    for (const left of placed) {
      for (const right of placed) {
        if (left.id !== right.id) {
          const gap = Math.hypot(left.frame.x - right.frame.x, left.frame.y - right.frame.y);
          expect(gap).toBeGreaterThan(0);
        }
      }
    }
  });

  test('is the same field for the same seed, and another for another', ({ expect }) => {
    const frame = { x: 0, y: 0, w: 300, h: 300 };
    const children = [box('a'), box('b')];
    const first = solveGrid({ layout: 'pack', packSeed: 3, packMin: 20, packMax: 60 }, frame, children);
    expect(solveGrid({ layout: 'pack', packSeed: 3, packMin: 20, packMax: 60 }, frame, children)).toEqual(first);
    expect(solveGrid({ layout: 'pack', packSeed: 4, packMin: 20, packMax: 60 }, frame, children)).not.toEqual(first);
  });

  test('places every child, smaller than asked where the sizes asked for do not fit', ({ expect }) => {
    // Three circles of 90 cannot fit a 200-wide frame, so all three are drawn smaller rather than two left out.
    const frame = { x: 0, y: 0, w: 200, h: 200 };
    const placed = solveGrid({ layout: 'pack', packSeed: 1, packMin: 90, packMax: 90, gap: 4 }, frame, [
      box('a'),
      box('b'),
      box('c'),
    ]);
    expect(placed.map(({ id }) => id)).toEqual(['a', 'b', 'c']);
    for (const { frame: child } of placed) {
      expect(child.w).toBeLessThan(180);
      expect(child.w).toBeGreaterThan(0);
      expect(child.x).toBeGreaterThanOrEqual(4);
      expect(child.x + child.w).toBeLessThanOrEqual(196);
    }
  });

  test('places every child for any seed of a field its sizes crowd', ({ expect }) => {
    // The Hyperspace field: nine members, sizes up to 185. Some seeds draw sizes that do not all fit at full size.
    const frame = { x: 0, y: 0, w: 592, h: 624 };
    const children = Array.from({ length: 9 }, (_, index) => box(`s${index}`));
    for (let packSeed = 0; packSeed < 64; packSeed++) {
      const placed = solveGrid({ layout: 'pack', packSeed, packMin: 36, packMax: 185, gap: 10 }, frame, children);
      expect(placed, `seed ${packSeed}`).toHaveLength(9);
    }
  });

  test('keeps the sizes its seed draws where they fit', ({ expect }) => {
    const rule = { layout: 'pack' as const, packSeed: 7, packMin: 40, packMax: 40, gap: 8 };
    const placed = solveGrid(rule, { x: 0, y: 0, w: 400, h: 400 }, [box('a'), box('b'), box('c')]);
    expect(placed.map(({ frame }) => frame.w)).toEqual([80, 80, 80]);
  });

  test('a child that states a size is a circle of that diameter; the rest take what the seed draws', ({ expect }) => {
    const frame = { x: 0, y: 0, w: 600, h: 600 };
    const rule = { layout: 'pack' as const, packSeed: 5, packMin: 20, packMax: 40, gap: 8 };
    const stated = solveGrid(rule, frame, [box('a'), { ...box('b'), width: 300 }, { ...box('c'), height: 120 }]);
    const widthOf = (id: string) => stated.find((entry) => entry.id === id)?.frame.w ?? 0;
    expect(widthOf('b')).toBe(300);
    expect(widthOf('c')).toBe(120);
    // The one that states nothing is drawn from the rule's range.
    expect(widthOf('a')).toBeGreaterThanOrEqual(40);
    expect(widthOf('a')).toBeLessThanOrEqual(80);
  });
});

describe('a packing whose sizes do not fit', () => {
  const frame = { x: 0, y: 0, w: 640, h: 672 };
  // The Hyperspace field as it is written: nine graphs, each asking for more than a ninth of the frame.
  const widths = [700, 500, 500, 550, 500, 550, 500, 575, 500];
  const children = widths.map((width, index) => ({ ...box(`s${index}`), width }));
  const rule = { layout: 'pack' as const, packSeed: 28, packMin: 36, packMax: 185, gap: 10 };
  const placed = solveGrid(rule, frame, children);

  test('fills the frame: the circles cover most of it, at one factor of the sizes asked', ({ expect }) => {
    expect(placed).toHaveLength(9);
    const factors = placed.map(({ frame: child }, index) => child.w / widths[index]);
    for (const factor of factors) {
      expect(factor).toBeCloseTo(factors[0], 6);
    }
    const covered = placed.reduce((area, { frame: child }) => area + (Math.PI * child.w * child.w) / 4, 0);
    expect(covered / (frame.w * frame.h)).toBeGreaterThan(0.55);
  });

  test('keeps every circle inside the frame and clear of the others by the gap', ({ expect }) => {
    for (const { frame: child } of placed) {
      expect(child.x).toBeGreaterThanOrEqual(10 - 0.001);
      expect(child.y).toBeGreaterThanOrEqual(10 - 0.001);
      expect(child.x + child.w).toBeLessThanOrEqual(frame.w - 10 + 0.001);
      expect(child.y + child.h).toBeLessThanOrEqual(frame.h - 10 + 0.001);
    }
    const circles = placed.map(({ frame: child }) => ({
      x: child.x + child.w / 2,
      y: child.y + child.h / 2,
      r: child.w / 2,
    }));
    for (const [index, left] of circles.entries()) {
      for (const right of circles.slice(index + 1)) {
        // Half a unit of the gap may be given up where two circles are pushed together.
        expect(Math.hypot(left.x - right.x, left.y - right.y)).toBeGreaterThanOrEqual(left.r + right.r + 10 - 0.5);
      }
    }
  });

  test('is the same field each time, and another for another seed', ({ expect }) => {
    expect(solveGrid(rule, frame, children)).toEqual(placed);
    expect(solveGrid({ ...rule, packSeed: 29 }, frame, children)).not.toEqual(placed);
  });
});

describe('a child that states its own size', () => {
  const frame = { x: 0, y: 0, w: 400, h: 200 };

  test('keeps it in the middle of its cell, and fills the axis it leaves out', ({ expect }) => {
    const placed = solveGrid({ cols: 2 }, frame, [
      { ...box('a'), width: 100 },
      { ...box('b'), width: 80, height: 50 },
    ]);
    const frames = new Map(placed.map((entry) => [entry.id, entry.frame]));
    expect(frames.get('a')).toEqual({ x: 50, y: 0, w: 100, h: 200 });
    expect(frames.get('b')).toEqual({ x: 260, y: 75, w: 80, h: 50 });
  });

  test('is what an `auto` track measures, over the frame the child was written with', ({ expect }) => {
    // The frame is the last solve's result once a drawing has been stored, so it cannot be what the child asks for.
    const placed = solveGrid({ cols: 'auto 1fr' }, frame, [{ ...box('a'), w: 999, width: 120 }, box('b')]);
    const frames = new Map(placed.map((entry) => [entry.id, entry.frame]));
    expect(frames.get('a')).toEqual({ x: 0, y: 0, w: 120, h: 200 });
    expect(frames.get('b')).toEqual({ x: 120, y: 0, w: 280, h: 200 });
  });
});
