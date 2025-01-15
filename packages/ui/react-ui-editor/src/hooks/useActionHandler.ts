//
// Copyright 2024 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { type EditorToolbarProps } from '../components';
import { processEditorPayload } from '../extensions';

export const useActionHandler = (view?: EditorView | null): EditorToolbarProps['onAction'] => {
  return (action) => view && processEditorPayload(view, action.properties);
};
