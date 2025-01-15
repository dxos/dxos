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

const listGroupAction = createEditorActionGroup('list', {
  variant: 'toggleGroup',
  selectCardinality: 'single',
} as ToolbarActionGroupProperties);

const listActionsMap = Object.fromEntries(
  Object.entries({
    bullet: 'ph--list-bullets--regular',
    ordered: 'ph--list-numbers--regular',
    task: 'ph--list-checks--regular',
  }).map(([listStyle, icon]) => {
    return [listStyle, createEditorAction({ type: `list-${listStyle}` as PayloadType }, icon)];
  }),
);

export const useLists = (graph: Graph, state: EditorToolbarState) => {
  useEffect(() => {
    // @ts-ignore
    graph._addNodes([listGroupAction as NodeArg<any>, ...Object.values(listActionsMap)]);
    // @ts-ignore
    graph._addEdges(Object.values(listActionsMap).map(({ id }) => ({ source: listGroupAction.id, target: id })));
  }, [graph]);

  useEffect(() => {
    invariant(graph);
    const list = graph.findNode('list');
    invariant(list);
    (list as DeepWriteable<ToolbarActionGroup>).properties.value = state.listStyle ?? '';
    graph.actions(list)?.forEach((listAction) => {
      const listStyle = listAction.id.split('-')[1];
      (listAction as DeepWriteable<EditorAction>).properties.checked = state.listStyle === listStyle;
    });
  }, [graph, state.listStyle]);

  return listGroupAction;
};
