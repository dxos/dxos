//
// Copyright 2026 DXOS.org
//

import { type ViewStateManager, defineViewState } from '@dxos/react-ui-attention';
import { type EditorStateStore, EditorSelectionStateSchema } from '@dxos/ui-editor';

/** Per-document editor scroll/caret state, persisted to localStorage on this device. */
export const editorViewStateSlice = defineViewState({
  key: 'editor',
  backend: 'local',
  schema: EditorSelectionStateSchema,
  defaultValue: () => ({}),
});

/** Adapts the imperative editor store seam onto the ViewState manager (local backend). */
export const createEditorViewStateStore = (manager: ViewStateManager): EditorStateStore => ({
  getState: (id) => manager.get(editorViewStateSlice, id),
  setState: (id, state) => manager.set(editorViewStateSlice, id, state),
});
