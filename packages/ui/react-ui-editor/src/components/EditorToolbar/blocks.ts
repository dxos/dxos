//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { type Node } from '@dxos/app-graph';
import { addBlockquote, addCodeblock, insertTable, removeBlockquote, removeCodeblock } from '@dxos/ui-editor';

import { createEditorMenuAction, createEditorMenuItemGroup } from './actions';
import { type EditorToolbarState } from './useEditorToolbar';

const createBlockGroupAction = (value: string) =>
  createEditorMenuItemGroup('block', {
    variant: 'toggleGroup',
    selectCardinality: 'single',
    value,
  });

const createBlockActions = (value: string, getView: () => EditorView, blankLine?: boolean) =>
  Object.entries({
    blockquote: 'ph--quotes--regular',
    codeblock: 'ph--code-block--regular',
    table: 'ph--table--regular',
  }).map(([type, icon]) => {
    const checked = type === value;
    return createEditorMenuAction(type, { checked, ...(type === 'table' && { disabled: !!blankLine }), icon }, () => {
      const view = getView();
      if (!view) {
        return;
      }

      switch (type) {
        case 'blockquote':
          checked ? removeBlockquote(view) : addBlockquote(view);
          break;
        case 'codeblock':
          checked ? removeCodeblock(view) : addCodeblock(view);
          break;
        case 'table':
          insertTable(view);
          break;
      }
    });
  });

export const createBlocks = (state: EditorToolbarState, getView: () => EditorView) => {
  const value = state?.blockQuote ? 'blockquote' : (state.blockType ?? '');
  const blockGroupAction = createBlockGroupAction(value);
  const blockActions = createBlockActions(value, getView, state.blankLine);
  return {
    nodes: [blockGroupAction as Node.NodeArg<any>, ...blockActions],
    edges: [
      { source: 'root', target: 'block', relation: 'child' },
      ...blockActions.map(({ id }) => ({ source: blockGroupAction.id, target: id, relation: 'child' })),
    ],
  };
};
