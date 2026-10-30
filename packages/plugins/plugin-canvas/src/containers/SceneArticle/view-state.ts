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
  /** The scene this viewer has open, by key; the canvas's first when unset or no longer listed. */
  scene: Schema.optional(Schema.String),
  /** Where the root scene was last left. */
  camera: Schema.optional(CameraSchema),
  /** This viewer only looks at the drawing: nothing is selected, and no tool, handle, port or panel edits it. */
  readonly: Schema.optional(Schema.Boolean),
  /** The inspectors (properties, layers, about) float over the canvas rather than docking beside it. */
  floating: Schema.optional(Schema.Boolean),
  /** Moves snap to the grid, which is drawn. */
  grid: Schema.optional(Schema.Boolean),
  /** The lattice's cells are drawn. */
  guides: Schema.optional(Schema.Boolean),
  /** The axes through the origin are drawn; hidden until turned on. */
  axes: Schema.optional(Schema.Boolean),
  /** The camera keeps the scene framed as the view resizes or opens another scene, until the viewer pans or zooms. */
  fit: Schema.optional(Schema.Boolean),
  /** Whether each group of the properties panel (`style`, `center`, …) is open, by path; unset, it is open. */
  groups: Schema.optional(Schema.Record(Schema.String, Schema.Boolean)),
});

export type CanvasViewState = Schema.Schema.Type<typeof CanvasViewStateSchema>;

/** This viewer's view of each canvas (localStorage), keyed by the canvas's URI. */
export const canvasViewAspect = ViewState.define<CanvasViewState, Schema.Codec.Encoded<typeof CanvasViewStateSchema>>({
  key: 'canvas-view',
  backend: 'local',
  schema: CanvasViewStateSchema,
  defaultValue: () => ({}),
});

const Vec3Schema = Schema.Struct({ x: Schema.Number, y: Schema.Number, z: Schema.Number });

/** `@dxos/scene`'s `Camera3D`, declared here for the same reason as the 2D camera above. */
const Camera3DSchema = Schema.Struct({
  target: Vec3Schema,
  yaw: Schema.Number,
  pitch: Schema.Number,
  distance: Schema.Number,
  fov: Schema.Number,
  projection: Schema.Literals(['perspective', 'orthographic']),
});

const Scene3DViewStateSchema = Schema.Struct({
  /** Where this viewer last left the orbit; the scene's own camera is the authored view and is never written. */
  camera: Schema.optional(Camera3DSchema),
  /** Whether this viewer draws the ground grid; shown until turned off. */
  grid: Schema.optional(Schema.Boolean),
  /** Whether gizmos and placing snap to the grid, apart from whether it is drawn; follows the grid until set. */
  snap: Schema.optional(Schema.Boolean),
  /** Whether this viewer draws the x, y and z axes through the origin; hidden until turned on. */
  axes: Schema.optional(Schema.Boolean),
  /** The look this viewer picked over the scene's own (`cad`, `presentation`, `clay` or `clay-light`). */
  theme: Schema.optional(Schema.Literals(['cad', 'presentation', 'clay', 'clay-light'])),
});

export type Scene3DViewState = Schema.Schema.Type<typeof Scene3DViewStateSchema>;

/** This viewer's view of each 3D canvas (localStorage), keyed by the canvas's URI. */
export const scene3dViewAspect = ViewState.define<
  Scene3DViewState,
  Schema.Codec.Encoded<typeof Scene3DViewStateSchema>
>({
  key: 'scene3d-view',
  backend: 'local',
  schema: Scene3DViewStateSchema,
  defaultValue: () => ({}),
});
