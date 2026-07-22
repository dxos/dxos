//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ViewState } from '@dxos/react-ui-attention';

import { VIEW_MODES, type ViewMode } from './viewMode';

/**
 * The message body view mode as per-context UI state, sticky per conversation and keyed by the
 * article's attendable id. The `local` backend persists it to localStorage, so the choice is restored
 * across navigation and reloads (best-effort — falls back to in-session memory when storage is blocked).
 */
export const messageViewModeAspect: ViewState.Aspect<ViewMode> = ViewState.define<ViewMode>({
  key: 'inbox-message-view-mode',
  backend: 'local',
  schema: Schema.Literal(...VIEW_MODES),
  defaultValue: () => 'html',
});
