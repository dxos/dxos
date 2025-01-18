//
// Copyright 2024 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { useCallback } from 'react';

import { type EditorAction, processEditorPayload } from '../extensions';

export const useActionHandler = (view?: EditorView | null) => {
  return useCallback((action: EditorAction) => view && processEditorPayload(view, action.properties), [view]);
};
