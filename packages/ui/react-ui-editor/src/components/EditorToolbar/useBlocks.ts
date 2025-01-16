//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import { type Graph, type NodeArg } from '@dxos/app-graph';
import { invariant } from '@dxos/invariant';
import { type ToolbarActionGroup, type ToolbarActionGroupProperties } from '@dxos/react-ui-menu';
import { type DeepWriteable } from '@dxos/util';

import { createEditorAction, createEditorActionGroup, type EditorToolbarState } from './util';
import { type EditorAction, type PayloadType } from '../../extensions';

const blockGroupAction = createEditorActionGroup('block', {
  variant: 'toggleGroup',
  selectCardinality: 'single',
} as ToolbarActionGroupProperties);

const blockActionsMap = Object.fromEntries(
  Object.entries({
    blockquote: 'ph--quotes--regular',
    codeblock: 'ph--code-block--regular',
    table: 'ph--table--regular',
  }).map(([type, icon]) => {
    return [type, createEditorAction({ type: type as PayloadType }, icon)];
  }),
);

export const useBlocks = (graph: Graph, state: EditorToolbarState) => {
  useEffect(() => {
    // @ts-ignore
    graph._addNodes([blockGroupAction as NodeArg<any>, ...Object.values(blockActionsMap)]);
    // @ts-ignore
    graph._addEdges(Object.values(blockActionsMap).map(({ id }) => ({ source: blockGroupAction.id, target: id })));
  }, [graph]);

  useEffect(() => {
    invariant(graph);
    const block = graph.findNode('block');
    invariant(block);
    const value = state?.blockQuote ? 'blockquote' : state.blockType ?? '';
    (block as DeepWriteable<ToolbarActionGroup>).properties.value = value;
    graph.actions(block)?.forEach((blockAction) => {
      (blockAction as DeepWriteable<EditorAction>).properties.checked = blockAction.id === value;
      if (blockAction.id === 'table') {
        (blockAction as DeepWriteable<EditorAction>).properties.disabled = !state.blankLine;
      }
    });
  }, [graph, state.blockType, state.blockQuote, state.blankLine]);

  return blockGroupAction;
};
