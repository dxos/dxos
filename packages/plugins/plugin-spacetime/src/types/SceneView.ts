//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { ViewState } from '@dxos/react-ui-attention/types';

/** An orbit camera's pose: the spherical coordinates around, and the point it looks at. */
export const Camera = Schema.Struct({
  alpha: Schema.Number,
  beta: Schema.Number,
  radius: Schema.Number,
  target: Schema.Struct({ x: Schema.Number, y: Schema.Number, z: Schema.Number }),
});
export type Camera = Schema.Schema.Type<typeof Camera>;

/**
 * The camera pose a scene was last viewed from, keyed by the scene's URI and persisted (localStorage)
 * so reopening the scene resumes where the viewer left it. `undefined` = never viewed, so the canvas
 * starts from its default pose.
 */
export const cameraAspect: ViewState.Aspect<Camera | undefined> = ViewState.define<Camera | undefined>({
  key: 'org.dxos.plugin.spacetime.camera',
  backend: 'local',
  schema: Schema.UndefinedOr(Camera),
  defaultValue: () => undefined,
});
