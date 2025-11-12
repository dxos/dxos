//
// Copyright 2025 DXOS.org
//

import { openSearchPanel } from '@codemirror/search';
import { type EditorView } from '@codemirror/view';

import { createEditorAction } from './actions';

const createSearchAction = (getView: () => EditorView) =>
  createEditorAction(
    'search',
    {
      testId: 'editor.toolbar.search',
      icon: 'ph--magnifying-glass--regular',
    },
    () => openSearchPanel(getView()),
  );

export const createSearch = (getView: () => EditorView) => ({
  nodes: [createSearchAction(getView)],
  edges: [{ source: 'root', target: 'search' }],
});
