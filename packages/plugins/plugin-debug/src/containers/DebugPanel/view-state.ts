//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ViewState } from '@dxos/react-ui-attention';

// Kept out of `DebugPanel.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a non-component export beside them forces a full page reload on every edit.

export const DebugPanelTabs = ['console', 'logs'] as const;

export type DebugPanelTab = (typeof DebugPanelTabs)[number];

export type DebugPanelViewState = {
  readonly tab: DebugPanelTab;
  readonly pinned: boolean;
};

/** The panel is a singleton in the status rail, so one context serves it. */
export const DEBUG_PANEL_CONTEXT = 'debug-panel';

/**
 * Tab and pin, persisted (localStorage) so a debugging session survives the reloads it provokes;
 * requires a `ViewStateProvider` ancestor to persist (degrades to the defaults without one).
 */
export const debugPanelAspect = ViewState.define<DebugPanelViewState>({
  key: 'debug-panel',
  backend: 'local',
  schema: Schema.Struct({
    tab: Schema.Literals(DebugPanelTabs),
    pinned: Schema.Boolean,
  }),
  defaultValue: () => ({ tab: 'console', pinned: false }),
});
