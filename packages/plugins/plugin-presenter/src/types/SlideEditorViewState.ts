//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { ViewState } from '@dxos/react-ui-attention/types';

export const PREVIEW_MODES = ['split', 'companion'] as const;

export type PreviewMode = (typeof PREVIEW_MODES)[number];

export const State = Schema.Struct({
  /** Where the slide editor shows the rendered slide. */
  previewMode: Schema.Literals(PREVIEW_MODES),
  /** Height of the editor pane in the split, in rem; unset until the user drags it, so the panes split evenly. */
  splitSize: Schema.optional(Schema.Number),
}).mapFields(Struct.map(Schema.mutableKey));

export type State = Schema.Schema.Type<typeof State>;

/** Per-user slide editor layout, kept locally and shared by every slide this user edits. */
export const aspect: ViewState.Aspect<State> = ViewState.define<State>({
  key: 'presenter-slide-editor',
  backend: 'local',
  schema: State,
  defaultValue: () => ({ previewMode: 'split' }),
});

/** The view-state context for the editor layout: one for all slides, so a choice carries from slide to slide. */
export const CONTEXT = 'presenter-slide-editor';

/** The companion variant that shows the rendered slide beside its editor. */
export const COMPANION_VARIANT = 'slide-preview';
