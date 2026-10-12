//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ViewState } from '@dxos/react-ui-attention/types';

// Kept out of `CanvasArticle.tsx`: react-refresh only fast-refreshes a module whose exports are all components.

/**
 * The engine's `Camera`, declared here rather than imported: the app graph reads this aspect, and
 * `@dxos/react-ui-canvas` would pull React into the plugin's node and workerd entries.
 */
const CameraSchema = Schema.Struct({ x: Schema.Number, y: Schema.Number, zoom: Schema.Number });

const CanvasViewStateSchema = Schema.Struct({
  /** Where the root scene was last left. */
  camera: Schema.optional(CameraSchema),
  /** This viewer only looks at the drawing: nothing is selected, and no tool, handle, port or panel edits it. */
  readonly: Schema.optional(Schema.Boolean),
  /** The properties and layers panels float over the canvas rather than docking beside it. */
  floating: Schema.optional(Schema.Boolean),
  /** Moves snap to the grid, which is drawn. */
  grid: Schema.optional(Schema.Boolean),
  /** The lattice's cells are drawn. */
  guides: Schema.optional(Schema.Boolean),
  /** The camera keeps the scene framed as the view resizes or opens another scene, until the viewer pans or zooms. */
  fit: Schema.optional(Schema.Boolean),
});

export type CanvasViewState = Schema.Schema.Type<typeof CanvasViewStateSchema>;

/** This viewer's view of each canvas (localStorage), keyed by the canvas's URI. */
export const canvasViewAspect = ViewState.define<CanvasViewState, Schema.Codec.Encoded<typeof CanvasViewStateSchema>>({
  key: 'canvas-view',
  backend: 'local',
  schema: CanvasViewStateSchema,
  defaultValue: () => ({}),
});
