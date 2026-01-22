//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { type Node } from '@dxos/app-graph';
import { type ToolbarMenuActionGroupProperties } from '@dxos/react-ui-menu';
import { addBlockquote, addCodeblock, insertTable, removeBlockquote, removeCodeblock } from '@dxos/ui-editor';

import { createEditorAction, createEditorActionGroup } from './actions';
import { type EditorToolbarState } from './useEditorToolbar';

const createBlockGroupAction = (value: string) =>
  createEditorActionGroup('block', {
    variant: 'toggleGroup',
    selectCardinality: 'single',
    value,
  } as ToolbarMenuActionGroupProperties);

const createBlockActions = (value: string, getView: () => EditorView, blankLine?: boolean) =>
  Object.entries({
    blockquote: 'ph--quotes--regular',
    codeblock: 'ph--code-block--regular',
    table: 'ph--table--regular',
  }).map(([type, icon]) => {
    const checked = type === value;
    return createEditorAction(type, { checked, ...(type === 'table' && { disabled: !!blankLine }), icon }, () => {
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
      { source: 'root', target: 'block' },
      ...blockActions.map(({ id }) => ({ source: blockGroupAction.id, target: id })),
    ],
  };
};
