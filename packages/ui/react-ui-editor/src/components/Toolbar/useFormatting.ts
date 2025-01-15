//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import { type Graph, type NodeArg } from '@dxos/app-graph';
import { invariant } from '@dxos/invariant';
import { type ToolbarActionGroup, type ToolbarActionGroupProperties } from '@dxos/react-ui-menu';
import { type DeepWriteable } from '@dxos/util';

import { createEditorAction, createEditorActionGroup, type EditorToolbarState } from './util';
import { type EditorAction, type Formatting, type PayloadType } from '../../extensions';

const formattingGroupAction = createEditorActionGroup('formatting', {
  variant: 'toggleGroup',
  selectCardinality: 'multiple',
} as ToolbarActionGroupProperties);

const formattingActionsMap = Object.fromEntries(
  Object.entries({
    strong: 'ph--text-b--regular',
    emphasis: 'ph--text-italic--regular',
    strikethrough: 'ph--text-strikethrough--regular',
    code: 'ph--code--regular',
    link: 'ph--link--regular',
  }).map(([type, icon]) => {
    return [type, createEditorAction({ type: type as PayloadType }, icon)];
  }),
);

export const useFormatting = (graph: Graph, state: EditorToolbarState) => {
  useEffect(() => {
    graph._addNodes([formattingGroupAction as NodeArg<any>, ...Object.values(formattingActionsMap)]);
    graph._addEdges(
      Object.values(formattingActionsMap).map(({ id }) => ({ source: formattingGroupAction.id, target: id })),
    );
  }, [graph]);

  useEffect(() => {
    invariant(graph);
    const formatting = graph.findNode('formatting');
    invariant(formatting);
    (formatting as DeepWriteable<ToolbarActionGroup>).properties.value = Object.keys(formattingActionsMap).filter(
      (key) => !!state[key as keyof Formatting],
    ) as ToolbarActionGroupProperties['value'];
    graph.actions(formatting)?.forEach((formattingAction) => {
      (formattingAction as DeepWriteable<EditorAction>).properties.checked =
        !!state[formattingAction.id as keyof Formatting];
    });
  }, [graph, ...Object.keys(formattingActionsMap).map((key) => state[key as keyof Formatting])]);

  return formattingGroupAction;
};
