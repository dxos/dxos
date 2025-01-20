//
// Copyright 2025 DXOS.org
//

import { type NodeArg } from '@dxos/app-graph';
import { type ToolbarMenuActionGroupProperties } from '@dxos/react-ui-menu';

import { createEditorAction, createEditorActionGroup, type EditorToolbarState } from './util';
import { type PayloadType } from '../../extensions';

const createBlockGroupAction = (value: string) =>
  createEditorActionGroup('block', {
    variant: 'toggleGroup',
    selectCardinality: 'single',
    value,
  } as ToolbarMenuActionGroupProperties);

const createBlockActions = (value: string, blankLine?: boolean) =>
  Object.entries({
    blockquote: 'ph--quotes--regular',
    codeblock: 'ph--code-block--regular',
    table: 'ph--table--regular',
  }).map(([type, icon]) => {
    return createEditorAction(
      { type: type as PayloadType, checked: type === value, ...(type === 'table' && { disabled: !!blankLine }) },
      icon,
    );
  });

export const createBlocks = (state: EditorToolbarState) => {
  const value = state?.blockQuote ? 'blockquote' : state.blockType ?? '';
  const blockGroupAction = createBlockGroupAction(value);
  const blockActions = createBlockActions(value, state.blankLine);
  return {
    nodes: [blockGroupAction as NodeArg<any>, ...blockActions],
    edges: [
      { source: 'root', target: 'block' },
      ...blockActions.map(({ id }) => ({ source: blockGroupAction.id, target: id })),
    ],
  };
};
