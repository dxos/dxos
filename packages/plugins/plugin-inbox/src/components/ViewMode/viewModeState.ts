//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type AspectDef, defineViewState } from '@dxos/react-ui-attention';

import { VIEW_MODES, type ViewMode } from './viewMode';

/**
 * The message body view mode as durable, per-context UI state (localStorage): sticky per conversation
 * and restored across navigation and reloads. Keyed by the article's attendable id (the context).
 */
export const messageViewModeAspect: AspectDef<ViewMode> = defineViewState<ViewMode>({
  key: 'inbox-message-view-mode',
  backend: 'local',
  schema: Schema.Literal(...VIEW_MODES),
  defaultValue: () => 'html',
});
