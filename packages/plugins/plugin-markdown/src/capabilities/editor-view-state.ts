//
// Copyright 2026 DXOS.org
//

import { invariant } from '@dxos/invariant';
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
  getState: (id) => {
    // Guard against an unset document id, which would key state under a literal "undefined".
    invariant(id);
    return manager.get(editorViewStateSlice, id);
  },
  setState: (id, state) => {
    invariant(id);
    manager.set(editorViewStateSlice, id, state);
  },
});
