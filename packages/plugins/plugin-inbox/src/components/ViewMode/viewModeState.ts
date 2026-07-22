//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type AspectDef, defineViewState } from '@dxos/react-ui-attention';

import { VIEW_MODES, type ViewMode } from './viewMode';

/** Global context: the message view mode is a per-device preference shared by every message. */
export const MESSAGE_VIEW_MODE_CONTEXT = 'inbox-message';

/**
 * The user's preferred message body view mode ({@link ViewMode}), persisted to localStorage so the
 * toolbar selection carries across messages and sessions on this device.
 */
export const messageViewModeAspect: AspectDef<ViewMode> = defineViewState<ViewMode>({
  key: 'inbox-message-view-mode',
  backend: 'local',
  schema: Schema.Literal(...VIEW_MODES),
  defaultValue: () => 'html',
});
