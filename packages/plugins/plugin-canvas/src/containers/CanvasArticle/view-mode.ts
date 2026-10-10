//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ViewState } from '@dxos/react-ui-attention/types';

// Apart from `view-state.ts`: the app graph toggles this, and the camera's schema would pull React into the graph.

const CanvasViewModeSchema = Schema.Struct({
  /** This viewer only looks at the drawing: nothing is selected, and no tool, handle, port or panel edits it. */
  readonly: Schema.optional(Schema.Boolean),
});

export type CanvasViewMode = Schema.Schema.Type<typeof CanvasViewModeSchema>;

/** Whether each canvas is read-only for this viewer (localStorage), keyed by the canvas's URI. */
export const canvasViewModeAspect = ViewState.define<CanvasViewMode, Schema.Codec.Encoded<typeof CanvasViewModeSchema>>(
  {
    key: 'canvas-view-mode',
    backend: 'local',
    schema: CanvasViewModeSchema,
    defaultValue: () => ({}),
  },
);
