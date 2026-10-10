//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ViewState } from '@dxos/react-ui-attention/types';
import { Camera } from '@dxos/react-ui-canvas/scene';

// Kept out of `CanvasArticle.tsx`: react-refresh only fast-refreshes a module whose exports are all components.

const CanvasViewStateSchema = Schema.Struct({ camera: Schema.optional(Camera) });

export type CanvasViewState = Schema.Schema.Type<typeof CanvasViewStateSchema>;

/** Where each canvas's root scene was last left (localStorage), keyed by the canvas's URI. */
export const canvasViewAspect = ViewState.define<CanvasViewState, Schema.Codec.Encoded<typeof CanvasViewStateSchema>>({
  key: 'canvas-view',
  backend: 'local',
  schema: CanvasViewStateSchema,
  defaultValue: () => ({}),
});
