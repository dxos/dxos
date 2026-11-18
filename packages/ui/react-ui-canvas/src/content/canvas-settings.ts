//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { BackgroundGrid } from '../model/index.ts';

/** A drawing's settings, which every collaborator sees; each viewer's own choices are kept in their view state. */
export const CanvasSettings = Schema.Struct({
  /**
   * Shapes snap to the lattice's cells and links route along its gutters. Read only to move it onto the layouts
   *, whose `lattice` is the mode now; kept so a canvas that still has it validates.
   */
  lattice: Schema.optional(Schema.Boolean),
  /**
   * The mode the canvas opened in; unset is `freehand`, or `lattice` while `lattice` is set. Read only to move it onto
   * the layouts, as `lattice` is.
   */
  projection: Schema.optional(Schema.Literals(['freehand', 'lattice', 'constrained', 'dynamic'])),
  /** Minor grid spacing in scene px; the engine's default when unset. */
  grid: Schema.optional(Schema.Number),
  /** Opens read-only for a viewer who has not chosen otherwise (their view state's `readonly` wins). */
  readonly: Schema.optional(Schema.Boolean),
  /** The theme every collaborator sees, over each one's own default; an id the theme registry resolves. */
  theme: Schema.optional(Schema.String),
  /** Overrides the theme's style set. */
  styleSet: Schema.optional(Schema.String),
  /** Overrides the theme's background. */
  background: Schema.optional(Schema.String),
  /** Overrides the background's grid. */
  backgroundGrid: Schema.optional(BackgroundGrid),
  /**
   * The illustrator DSL's elements draw as the diagram's own SVG renderer draws them (diagram nodes and connectors)
   * rather than as canvas shapes: a laid-out diagram brought onto the canvas keeps the look it had.
   */
  diagramShapes: Schema.optional(Schema.Boolean),
  /**
   * What Fit frames, in scene units, rather than the scene's own content. Drawings of one page that each fill it
   * differently (a deck of slides) then open at ONE scale, since every view frames the same box.
   */
  fitFrame: Schema.optional(
    Schema.Struct({ x: Schema.Number, y: Schema.Number, width: Schema.Number, height: Schema.Number }),
  ),
  /**
   * The highest zoom a fit reaches. It stops at 1:1 unless raised, so a drawing smaller than its view is centred at
   * its natural size rather than enlarged; a drawing meant to fill the view (a slide) raises it.
   */
  fitZoom: Schema.optional(Schema.Number),
});
export type CanvasSettings = Schema.Schema.Type<typeof CanvasSettings>;
