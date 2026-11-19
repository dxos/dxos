//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DEFAULT_GRID } from '@dxos/scene';

import {
  DEFAULT_LATTICE,
  type DrawingValues,
  drawingOverrides,
  drawingWrites,
  latticeInForm,
  latticeValues,
} from './drawing-form.ts';

const VALUES: DrawingValues = {
  grid: DEFAULT_GRID,
  lattice: false,
  ...latticeValues(DEFAULT_LATTICE, DEFAULT_GRID),
};

// A lattice on the default grid of 12: a cell of 10 by 5, with 2 between.
const LATTICE = { width: 120, height: 60, gutterX: 24, gutterY: 24 };
const ON: DrawingValues = { ...VALUES, lattice: true, ...latticeValues(LATTICE, DEFAULT_GRID) };

describe('drawingOverrides', () => {
  test('the grid is a whole pitch, the gutter has no row, and the cell shows only once the lattice is on', ({
    expect,
  }) => {
    expect(drawingOverrides({ lattice: false })).toEqual({
      grid: { min: 1, step: 1 },
      gutter: { hidden: true },
      cell: { hidden: true },
    });
    expect(drawingOverrides({ lattice: true })).toEqual({ grid: { min: 1, step: 1 }, gutter: { hidden: true } });
  });
});

describe('latticeValues', () => {
  test('the stored lattice reads as a cell and a gutter, each a count of grid cells', ({ expect }) => {
    expect(latticeValues(LATTICE, 12)).toEqual({ cell: { width: 10, height: 5 }, gutter: { x: 2, y: 2 } });
    expect(latticeValues(LATTICE, 6)).toEqual({ cell: { width: 20, height: 10 }, gutter: { x: 4, y: 4 } });
    expect(latticeValues(DEFAULT_LATTICE, DEFAULT_GRID)).toEqual({
      cell: { width: 16, height: 8 },
      gutter: { x: 8, y: 8 },
    });
  });

  test('a length off the grid reads as the nearest whole count, and never as none', ({ expect }) => {
    expect(latticeValues({ width: 100, height: 60, gutterX: 20, gutterY: 4 }, 12)).toEqual({
      cell: { width: 8, height: 5 },
      gutter: { x: 2, y: 1 },
    });
  });
});

describe('latticeInForm', () => {
  const custom = { width: 256, height: 128, gutterX: 128, gutterY: 64 };

  test('a layout off its lattice holds the one it last had, so turning it on again brings the same cells back', ({
    expect,
  }) => {
    const off: DrawingValues = { grid: 16, ...latticeInForm(undefined, custom, 16) };
    expect(off).toMatchObject({ lattice: false, cell: { width: 16, height: 8 }, gutter: { x: 8, y: 4 } });
    expect(drawingWrites(off, { ...off, lattice: true })).toEqual([
      { kind: 'layout', patch: { grid: 16, lattice: custom } },
    ]);
  });

  test('a layout on a lattice holds its own, and one that never had one starts on the default counts', ({ expect }) => {
    expect(latticeInForm(custom, DEFAULT_LATTICE, 16)).toMatchObject({ lattice: true, cell: { width: 16, height: 8 } });
    expect(latticeInForm(undefined, undefined, 20)).toEqual({
      lattice: false,
      cell: { width: 16, height: 8 },
      gutter: { x: 8, y: 8 },
    });
  });
});

describe('drawingWrites', () => {
  test('a save of an untouched form is no edit, and a new grid alone is written alone', ({ expect }) => {
    expect(drawingWrites(VALUES, VALUES)).toEqual([]);
    expect(drawingWrites(ON, ON)).toEqual([]);
    expect(drawingWrites(VALUES, { ...VALUES, grid: 24 })).toEqual([{ kind: 'layout', patch: { grid: 24 } }]);
  });

  test('a grid of none or less than one is no pitch, so it is left as it was', ({ expect }) => {
    expect(drawingWrites(VALUES, { ...VALUES, grid: undefined })).toEqual([]);
    expect(drawingWrites(VALUES, { ...VALUES, grid: 0 })).toEqual([]);
  });

  test('the toggle gives a drawing with no lattice the default counts on its own grid', ({ expect }) => {
    expect(drawingWrites(VALUES, { ...VALUES, lattice: true })).toEqual([
      { kind: 'layout', patch: { grid: DEFAULT_GRID, lattice: DEFAULT_LATTICE } },
    ]);
    const coarse: DrawingValues = { ...VALUES, grid: 16 };
    expect(drawingWrites(coarse, { ...coarse, lattice: true })).toEqual([
      { kind: 'layout', patch: { grid: 16, lattice: { width: 256, height: 128, gutterX: 128, gutterY: 128 } } },
    ]);
    // Turned off, the layout's lattice is unset rather than left, and the grid it was on stays.
    const [intent] = drawingWrites(ON, { ...ON, lattice: false });
    expect(intent).toEqual({ kind: 'layout', patch: { grid: DEFAULT_GRID, lattice: undefined } });
    expect(intent.kind === 'layout' && 'lattice' in intent.patch).toBe(true);
  });

  test('the cell and the gutter are counts of grid cells, written as lengths while the lattice is on', ({ expect }) => {
    expect(drawingWrites(ON, { ...ON, cell: { width: 12, height: 5 } })).toEqual([
      { kind: 'layout', patch: { grid: DEFAULT_GRID, lattice: { ...LATTICE, width: 144 } } },
    ]);
    expect(drawingWrites(ON, { ...ON, gutter: { x: 3, y: 2 } })).toEqual([
      { kind: 'layout', patch: { grid: DEFAULT_GRID, lattice: { ...LATTICE, gutterX: 36 } } },
    ]);
    // A count is whole and at least one, whatever was typed.
    expect(drawingWrites(ON, { ...ON, gutter: { x: 2.6, y: 0 } })).toEqual([
      { kind: 'layout', patch: { grid: DEFAULT_GRID, lattice: { ...LATTICE, gutterX: 36, gutterY: 12 } } },
    ]);
    // The same counts, written again: no edit; and none while the lattice is off.
    expect(drawingWrites(ON, { ...ON, ...latticeValues(LATTICE, DEFAULT_GRID) })).toEqual([]);
    expect(drawingWrites(VALUES, { ...VALUES, ...latticeValues(LATTICE, DEFAULT_GRID) })).toEqual([]);
  });

  test('a new grid under a lattice rescales it, since its cells are counts of the grid', ({ expect }) => {
    expect(drawingWrites(ON, { ...ON, grid: 16 })).toEqual([
      { kind: 'layout', patch: { grid: 16, lattice: { width: 160, height: 80, gutterX: 32, gutterY: 32 } } },
    ]);
  });
});
