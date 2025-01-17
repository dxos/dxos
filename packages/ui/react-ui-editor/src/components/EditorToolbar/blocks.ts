//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-react';

import { type Graph, type NodeArg } from '@dxos/app-graph';
import { type ToolbarActionGroup, type ToolbarActionGroupProperties } from '@dxos/react-ui-menu';

import { createEditorAction, createEditorActionGroup, type EditorToolbarState } from './util';
import { type PayloadType } from '../../extensions';

const createBlockGroupAction = (value: string) =>
  createEditorActionGroup('block', {
    variant: 'toggleGroup',
    selectCardinality: 'single',
    value,
  } as ToolbarActionGroupProperties);

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

export const mountBlocks = (graph: Graph, state: EditorToolbarState): [ToolbarActionGroup, () => void] => {
  const unsubscribe = effect(() => {
    const value = state?.blockQuote ? 'blockquote' : state.blockType ?? '';
    const blockGroupAction = createBlockGroupAction(value);
    const blockActions = createBlockActions(value, state.blankLine);
    // @ts-ignore
    graph._addNodes([blockGroupAction as NodeArg<any>, ...blockActions]);
    // @ts-ignore
    graph._addEdges(blockActions.map(({ id }) => ({ source: blockGroupAction.id, target: id })));
  });
  return [graph.findNode('block') as ToolbarActionGroup, unsubscribe];
};
