//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ViewState } from '@dxos/react-ui-attention';

// Kept out of `DebugPanel.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a non-component export beside them forces a full page reload on every edit.

const Point = Schema.Struct({ x: Schema.Number, y: Schema.Number });

const Size = Schema.Struct({ width: Schema.Number, height: Schema.Number });

export type DebugPanelViewState = {
  /** Qualified id of the selected page; absent until something is chosen. */
  readonly nodeId?: string;
  /** Joined paths (`Path.create`) of the expanded branches. */
  readonly open: readonly string[];
  /** Where the floating panel was last left; absent until it has been dragged. */
  readonly position?: Schema.Schema.Type<typeof Point>;
  /** The size the floating panel was last resized to; absent until it has been. */
  readonly size?: Schema.Schema.Type<typeof Size>;
};

/** The panel is a singleton in the status rail, so one context serves it. */
export const DEBUG_PANEL_CONTEXT = 'debug-panel';

/**
 * Selection, expansion, position and size, persisted (localStorage) so a debugging session survives
 * the reloads it provokes; requires a `ViewStateProvider` ancestor to persist (degrades to the
 * defaults without one). A stored value of an earlier shape fails decoding and yields the default.
 */
export const debugPanelAspect = ViewState.define<DebugPanelViewState>({
  key: 'debug-panel',
  backend: 'local',
  schema: Schema.Struct({
    nodeId: Schema.optional(Schema.String),
    open: Schema.Array(Schema.String),
    position: Schema.optional(Point),
    size: Schema.optional(Size),
  }),
  defaultValue: () => ({ open: [] }),
});
