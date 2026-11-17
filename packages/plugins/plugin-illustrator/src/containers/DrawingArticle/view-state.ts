//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ViewState } from '@dxos/react-ui-attention/types';

// Kept out of `DrawingArticle.tsx`: react-refresh only fast-refreshes a module whose exports are all components.

/** Where a variant's view looks, in that variant's own camera terms; a leader and its follower render the same variant. */
export const DrawingCamera = Schema.Struct({ x: Schema.Number, y: Schema.Number, zoom: Schema.Number });
export type DrawingCamera = Schema.Schema.Type<typeof DrawingCamera>;

const DrawingViewStateSchema = Schema.Struct({ camera: Schema.optional(DrawingCamera) });

/** This session's camera on each drawing, keyed by the drawing's URI; a follower takes the leader's. */
export const drawingViewAspect = ViewState.define<Schema.Schema.Type<typeof DrawingViewStateSchema>>({
  key: 'org.dxos.plugin.illustrator.drawing-view',
  backend: 'memory',
  schema: DrawingViewStateSchema,
  defaultValue: () => ({}),
  follow: 'write',
});
