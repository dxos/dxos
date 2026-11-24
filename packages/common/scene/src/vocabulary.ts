//
// Copyright 2026 DXOS.org
//

// The words every part of a drawing shares: its geometry, and the values a style may take. The stored elements, the
// editor's nodes and links and the diagram's shapes all state them with these, so one word means one thing.

import * as Schema from 'effect/Schema';

export const Point = Schema.Struct({ x: Schema.Number, y: Schema.Number });
export type Point = Schema.Schema.Type<typeof Point>;

export const Size = Schema.Struct({ width: Schema.Number, height: Schema.Number });
export type Size = Schema.Schema.Type<typeof Size>;

export const Bounds = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
});
export type Bounds = Schema.Schema.Type<typeof Bounds>;

export const SIDES = ['top', 'right', 'bottom', 'left'] as const;
export const Side = Schema.Literals(SIDES);
export type Side = Schema.Schema.Type<typeof Side>;

/** Where text sits across a shape, and down it. */
export const ALIGNS = ['left', 'center', 'right'] as const;
export const VALIGNS = ['top', 'middle', 'bottom'] as const;
export const Align = Schema.Literals(ALIGNS);
export type Align = Schema.Schema.Type<typeof Align>;
export const VerticalAlign = Schema.Literals(VALIGNS);
export type VerticalAlign = Schema.Schema.Type<typeof VerticalAlign>;

/**
 * How a line is drawn: a link's stroke, or a node's border. `none` draws no line; `sketchy` is the hand-drawn stroke
 * of a diagram, which a renderer without one draws solid.
 */
export const STROKES = ['none', 'solid', 'dashed', 'dotted', 'sketchy'] as const;
export const Stroke = Schema.Literals(STROKES);
export type Stroke = Schema.Schema.Type<typeof Stroke>;

/** The strokes that are a dash pattern, which a border and a link's line both take. */
export const DASHES = ['solid', 'dashed', 'dotted'] as const;
export type Dash = (typeof DASHES)[number];

/** The dash a stroke draws with; none for `none` and unset, so the look's own draws. */
export const strokeDash = (stroke: Stroke | undefined): Dash | undefined =>
  stroke === undefined || stroke === 'none' ? undefined : stroke === 'sketchy' ? 'solid' : stroke;

/**
 * What a closed shape is filled with: nothing, its colour, a light wash of it (`tint`), a hatching (`pattern`), or a
 * translucent material (`glass`). A renderer without a material draws `glass` solid, and one without a hatching draws
 * `pattern` as its own plain fill.
 */
export const FILLS = ['none', 'solid', 'tint', 'pattern', 'glass'] as const;
export const Fill = Schema.Literals(FILLS);
export type Fill = Schema.Schema.Type<typeof Fill>;

/** Which corners a shape rounds; unset is the look's own corner. */
export const CORNERS = ['all', 'top', 'bottom', 'none'] as const;
export const Corners = Schema.Literals(CORNERS);
export type Corners = Schema.Schema.Type<typeof Corners>;

/** Stroke weight and text size together, as a diagram scales them. */
export const WEIGHTS = ['s', 'm', 'l', 'xl'] as const;
export const Weight = Schema.Literals(WEIGHTS);
export type Weight = Schema.Schema.Type<typeof Weight>;
