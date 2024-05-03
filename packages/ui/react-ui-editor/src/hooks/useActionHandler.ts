//
// Copyright 2024 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { type ToolbarProps } from '../components';
import { processAction } from '../extensions';

export const useActionHandler = (view?: EditorView | null): ToolbarProps['onAction'] => {
  return (action) => view && processAction(view, action);
};
