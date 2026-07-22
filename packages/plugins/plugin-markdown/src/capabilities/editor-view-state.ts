//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { invariant } from '@dxos/invariant';
import { type Aspect, type ViewStateManager, defineViewState } from '@dxos/react-ui-attention/types';
import { EditorSelectionStateSchema, type EditorStateStore } from '@dxos/ui-editor';
import { EditorViewMode } from '@dxos/ui-editor/types';

/** Per-document editor scroll/caret state, persisted to localStorage on this device. */
export const editorViewStateAspect = defineViewState({
  key: 'editor',
  backend: 'local',
  schema: EditorSelectionStateSchema,
  defaultValue: () => ({}),
});

/**
 * Per-document editor view mode (preview/readonly/source) override, persisted to localStorage. Sticky
 * per document and restored across navigation/reloads (best-effort). `undefined` = no per-document
 * override, so the caller falls back to the `defaultViewMode` setting.
 */
export const editorViewModeAspect: Aspect<EditorViewMode | undefined> = defineViewState<EditorViewMode | undefined>({
  key: 'editor-view-mode',
  backend: 'local',
  schema: Schema.UndefinedOr(EditorViewMode),
  defaultValue: () => undefined,
});

/** Adapts the imperative editor store seam onto the ViewState manager (local backend). */
export const createEditorViewStateStore = (manager: ViewStateManager): EditorStateStore => ({
  getState: (id) => {
    // Guard against an unset document id, which would key state under a literal "undefined".
    invariant(id);
    return manager.get(editorViewStateAspect, id);
  },
  setState: (id, state) => {
    invariant(id);
    manager.set(editorViewStateAspect, id, state);
  },
});
