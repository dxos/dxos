//
// Copyright 2024 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { type EditorAction, processEditorPayload } from '../extensions';

export const useActionHandler = (view?: EditorView | null) => {
  return (action: EditorAction) => view && processEditorPayload(view, action.properties);
};
