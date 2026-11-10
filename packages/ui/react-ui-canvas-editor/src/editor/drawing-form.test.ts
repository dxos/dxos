//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DEFAULT_GRID } from '@dxos/scene';

import { DEFAULT_LATTICE, type DrawingValues, drawingOverrides, drawingWrites, latticeValues } from './drawing-form.ts';

const VALUES: DrawingValues = { grid: DEFAULT_GRID, lattice: false, ...latticeValues(DEFAULT_LATTICE) };
const LATTICE = { width: 100, height: 60, gutterX: 20, gutterY: 20 };

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
  test('the stored lattice reads as a cell and a gutter', ({ expect }) => {
    expect(latticeValues(LATTICE)).toEqual({ cell: { width: 100, height: 60 }, gutter: { x: 20, y: 20 } });
  });
});

describe('drawingWrites', () => {
  test('only the fields that changed are written', ({ expect }) => {
    expect(drawingWrites(VALUES, VALUES)).toEqual([]);
    expect(drawingWrites(VALUES, { ...VALUES, grid: 24 })).toEqual([{ kind: 'layout', patch: { grid: 24 } }]);
  });

  test('a grid of none or less than one is no pitch, so it is left as it was', ({ expect }) => {
    expect(drawingWrites(VALUES, { ...VALUES, grid: undefined })).toEqual([]);
    expect(drawingWrites(VALUES, { ...VALUES, grid: 0 })).toEqual([]);
  });

  test('the toggle gives a drawing with no lattice the default one', ({ expect }) => {
    expect(drawingWrites(VALUES, { ...VALUES, lattice: true })).toEqual([
      { kind: 'layout', patch: { lattice: DEFAULT_LATTICE } },
    ]);
    // Turned off, the layout's lattice is unset rather than left.
    const on: DrawingValues = { ...VALUES, lattice: true, ...latticeValues(LATTICE) };
    const [intent] = drawingWrites(on, { ...on, lattice: false });
    expect(intent).toEqual({ kind: 'layout', patch: { lattice: undefined } });
    expect(intent.kind === 'layout' && 'lattice' in intent.patch).toBe(true);
  });

  test('the cell and the gutter are written while the lattice is on, and ignored while it is off', ({ expect }) => {
    const on: DrawingValues = { ...VALUES, lattice: true, ...latticeValues(LATTICE) };
    expect(drawingWrites(on, { ...on, cell: { width: 120, height: 60 } })).toEqual([
      { kind: 'layout', patch: { lattice: { ...LATTICE, width: 120 } } },
    ]);
    expect(drawingWrites(on, { ...on, gutter: { x: 32, y: 20 } })).toEqual([
      { kind: 'layout', patch: { lattice: { ...LATTICE, gutterX: 32 } } },
    ]);
    // The same cell and gutter, written again: no edit.
    expect(drawingWrites(on, { ...on, ...latticeValues(LATTICE) })).toEqual([]);
    expect(drawingWrites(VALUES, { ...VALUES, ...latticeValues(LATTICE) })).toEqual([]);
  });

  test('the grid and the lattice travel in one patch', ({ expect }) => {
    expect(drawingWrites(VALUES, { ...VALUES, grid: 32, lattice: true, ...latticeValues(LATTICE) })).toEqual([
      { kind: 'layout', patch: { grid: 32, lattice: LATTICE } },
    ]);
  });
});
