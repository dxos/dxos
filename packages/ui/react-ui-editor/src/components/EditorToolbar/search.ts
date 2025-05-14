//
// Copyright 2025 DXOS.org
//

import { openSearchPanel } from '@codemirror/search';
import { type EditorView } from '@codemirror/view';

import { createEditorAction } from './util';

const createSearchAction = (getView: () => EditorView) =>
  createEditorAction('search', () => openSearchPanel(getView()), {
    testId: 'editor.toolbar.search',
    icon: 'ph--magnifying-glass--regular',
  });

export const createSearch = (getView: () => EditorView) => ({
  nodes: [createSearchAction(getView)],
  edges: [{ source: 'root', target: 'search' }],
});
