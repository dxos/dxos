//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type FormFieldOverride } from '@dxos/react-ui-form';
import { DEFAULT_GRID, type LayoutIntent, type Scene } from '@dxos/scene';
import { NumberLayoutAnnotationId, StepAnnotationId, VECTOR_AXIS_LAYOUT, VectorAnnotationId } from '@dxos/ui-types';

/** An axis as a form edits it: the stepper moves by one minor grid cell, as the Properties form's vectors do. */
const axis = (title: string) =>
  Schema.Number.annotate({ title, [StepAnnotationId]: DEFAULT_GRID, [NumberLayoutAnnotationId]: VECTOR_AXIS_LAYOUT });

/** The lattice as two vectors, so the form draws them side by side as it draws an element's centre and size. */
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

/** The lattice a drawing takes when the toggle first turns it on. */
export const DEFAULT_LATTICE: Scene.Lattice = { width: 192, height: 96, gutterX: 96, gutterY: 96 };

/** The stored lattice as the form's two vectors. */
export const latticeValues = (lattice: Scene.Lattice): Pick<DrawingValues, 'cell' | 'gutter'> => ({
  cell: { width: lattice.width, height: lattice.height },
  gutter: { x: lattice.gutterX, y: lattice.gutterY },
});

/** The form's two vectors as a stored lattice; an axis the form never showed keeps the default. */
const latticeOf = (values: DrawingValues): Scene.Lattice | undefined =>
  values.lattice === true
    ? {
        width: values.cell?.width ?? DEFAULT_LATTICE.width,
        height: values.cell?.height ?? DEFAULT_LATTICE.height,
        gutterX: values.gutter?.x ?? DEFAULT_LATTICE.gutterX,
        gutterY: values.gutter?.y ?? DEFAULT_LATTICE.gutterY,
      }
    : undefined;

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
 * What a save writes to the open layout. Only the fields that changed are written, so a save of an untouched form is
 * no edit at all; a grid of none or less than one is no pitch, so it is left as it was.
 */
export const drawingWrites = (current: DrawingValues, next: DrawingValues): LayoutIntent[] => {
  const grid = next.grid !== undefined && next.grid >= 1 && next.grid !== current.grid ? next.grid : undefined;
  const lattice = latticeOf(next);
  const changed = !sameLattice(latticeOf(current), lattice);
  if (grid === undefined && !changed) {
    return [];
  }
  return [
    {
      kind: 'layout',
      patch: { ...(grid === undefined ? {} : { grid }), ...(changed ? { lattice } : {}) },
    },
  ];
};
