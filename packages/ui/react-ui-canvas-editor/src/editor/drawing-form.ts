//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { reseatWrites } from '@dxos/react-ui-canvas';
import { type FormFieldOverride } from '@dxos/react-ui-form';
import { DEFAULT_GRID, type LayoutIntent, type Scene } from '@dxos/scene';
import { NumberLayoutAnnotationId, StepAnnotationId, VECTOR_AXIS_LAYOUT, VectorAnnotationId } from '@dxos/ui-types';

/** An axis of the lattice as the form edits it: a whole number of grid cells, so the stepper moves by one. */
const axis = (title: string) =>
  Schema.Number.annotate({ title, [StepAnnotationId]: 1, [NumberLayoutAnnotationId]: VECTOR_AXIS_LAYOUT });

/**
 * The lattice as two vectors, so the form draws them side by side as it draws an element's centre and size. Each axis
 * is a count of grid cells rather than a length: a cell and a gutter are then always whole cells of the grid drawn
 * under them, and the lattice stored is the counts times the grid.
 */
const CELL = Schema.Struct({ width: axis('W'), height: axis('H') }).annotate({ [VectorAnnotationId]: true });
const GUTTER = Schema.Struct({ x: axis('X'), y: axis('Y') }).annotate({ [VectorAnnotationId]: true });

/** The gutter's type, for the geometry field that draws it beside the cell. */
export const latticeGutterType = GUTTER.ast;

/**
 * The drawing's own properties, which are the open layout's: its grid pitch, and whether it is laid out on a lattice.
 * What this viewer sees — the look, the grid drawn, snapping, guides and axes — is the display panel's, not this form's.
 */
export const drawingSchema = Schema.Struct({
  grid: Schema.optional(Schema.Number.annotate({ title: 'Grid size' })),
  lattice: Schema.optional(Schema.Boolean.annotate({ title: 'Lattice' })),
  cell: Schema.optional(CELL.annotate({ title: 'Cell' })),
  gutter: Schema.optional(GUTTER.annotate({ title: 'Gutter' })),
});

export type DrawingValues = Schema.Schema.Type<typeof drawingSchema>;

/** The lattice a drawing takes when the toggle first turns it on, on the default grid: 16 by 8 cells, 8 between. */
export const DEFAULT_LATTICE: Scene.Lattice = { width: 192, height: 96, gutterX: 96, gutterY: 96 };

/** A count of grid cells: whole, and at least one, since a cell or a gutter of none is no lattice. */
const whole = (count: number): number => Math.max(1, Math.round(count));

/** The grid a form's values are on; a grid of none or less than one is no pitch. */
const pitch = (values: DrawingValues): number | undefined =>
  values.grid !== undefined && values.grid >= 1 ? values.grid : undefined;

/** The stored lattice as the form's two vectors, in cells of `grid`; a length off the grid reads as the nearest. */
export const latticeValues = (lattice: Scene.Lattice, grid: number): Pick<DrawingValues, 'cell' | 'gutter'> => ({
  cell: { width: whole(lattice.width / grid), height: whole(lattice.height / grid) },
  gutter: { x: whole(lattice.gutterX / grid), y: whole(lattice.gutterY / grid) },
});

/**
 * The lattice the form holds for a layout: its own while it is on one, else the one it last had (`last`), so turning
 * the lattice off and on again brings back the same cells rather than the default's, which would move every shape
 * to a different one. A layout that never had a lattice starts on the default's counts, whatever its grid.
 */
export const latticeInForm = (
  stored: Scene.Lattice | undefined,
  last: Scene.Lattice | undefined,
  grid: number,
): Pick<DrawingValues, 'lattice' | 'cell' | 'gutter'> => {
  const lattice = stored ?? last;
  return {
    lattice: stored !== undefined,
    ...(lattice ? latticeValues(lattice, grid) : latticeValues(DEFAULT_LATTICE, DEFAULT_GRID)),
  };
};

/** The form's two vectors as a stored lattice on `grid`; an axis the form never showed keeps the default count. */
const latticeOf = (values: DrawingValues, grid: number): Scene.Lattice | undefined => {
  if (values.lattice !== true) {
    return undefined;
  }
  const { cell, gutter } = latticeValues(DEFAULT_LATTICE, DEFAULT_GRID);
  const length = (count: number | undefined, otherwise: number | undefined) => whole(count ?? otherwise ?? 1) * grid;
  return {
    width: length(values.cell?.width, cell?.width),
    height: length(values.cell?.height, cell?.height),
    gutterX: length(values.gutter?.x, gutter?.x),
    gutterY: length(values.gutter?.y, gutter?.y),
  };
};

/**
 * The grid is a pitch, so it is whole and at least one; the lattice shows only once the toggle is on, and the gutter
 * is drawn beside the cell by the geometry field, so it has no row of its own.
 */
export const drawingOverrides = ({ lattice }: { lattice: boolean }): Record<string, FormFieldOverride> => ({
  grid: { min: 1, step: 1 },
  gutter: { hidden: true },
  ...(lattice ? {} : { cell: { hidden: true } }),
});

const sameLattice = (left: Scene.Lattice | undefined, right: Scene.Lattice | undefined): boolean =>
  left === right ||
  (left !== undefined &&
    right !== undefined &&
    left.width === right.width &&
    left.height === right.height &&
    left.gutterX === right.gutterX &&
    left.gutterY === right.gutterY);

/**
 * What a save writes to the open layout. A save of an untouched form is no edit at all; a grid of none or less than
 * one is no pitch, so it is left as it was. The lattice is the form's counts times the grid, so a change of grid
 * while the lattice is on rescales it. The grid in force is written with every edit: a layout that stores none takes
 * its pitch from its lattice, and the counts just typed would otherwise be read back against a different grid.
 */
export const drawingWrites = (current: DrawingValues, next: DrawingValues): LayoutIntent[] => {
  const before = pitch(current) ?? DEFAULT_GRID;
  const grid = pitch(next) ?? before;
  const lattice = latticeOf(next, grid);
  const changed = !sameLattice(latticeOf(current, before), lattice);
  if (grid === before && !changed) {
    return [];
  }
  return [{ kind: 'layout', patch: { grid, ...(changed ? { lattice } : {}) } }];
};

/** One intent a save writes, and the layout it is written to. */
export type DrawingSave = { layout: string; intent: LayoutIntent };

/**
 * What a save writes to the document: the open layout's own fields ({@link drawingWrites}) and, when its lattice
 * changes size, every shape re-seated on the cells it had. The open layout's shapes travel in one batch with the
 * lattice, so its mode checks them against the new cells rather than the old; a hull's shapes are stored in the
 * hull's group, so they are a write to that layout.
 */
export const drawingSaves = (
  document: Scene.SceneDocument,
  layout: string,
  current: DrawingValues,
  next: DrawingValues,
): DrawingSave[] => {
  const [intent] = drawingWrites(current, next);
  if (!intent) {
    return [];
  }
  const lattice = intent.kind === 'layout' ? intent.patch.lattice : undefined;
  const seated = lattice
    ? reseatWrites(document, layout, lattice).flatMap((write) => (write.kind === 'layout' ? [write] : []))
    : [];
  const own = seated.filter((write) => write.layout === layout).map((write) => write.intent);
  return [
    { layout, intent: own.length > 0 ? { kind: 'batch', intents: [intent, ...own] } : intent },
    ...seated
      .filter((write) => write.layout !== layout)
      .map((write) => ({ layout: write.layout, intent: write.intent })),
  ];
};
