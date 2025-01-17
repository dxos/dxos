//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-react';

import { type Graph, type NodeArg } from '@dxos/app-graph';
import { type ToolbarActionGroup, type ToolbarActionGroupProperties } from '@dxos/react-ui-menu';

import { createEditorAction, createEditorActionGroup, type EditorToolbarState } from './util';
import { type PayloadType } from '../../extensions';

const listStyles = {
  bullet: 'ph--list-bullets--regular',
  ordered: 'ph--list-numbers--regular',
  task: 'ph--list-checks--regular',
};

const createListGroupAction = (value: string) =>
  createEditorActionGroup('list', {
    variant: 'toggleGroup',
    selectCardinality: 'single',
    value,
  } as ToolbarActionGroupProperties);

const createListActions = (value: string) =>
  Object.entries(listStyles).map(([listStyle, icon]) =>
    createEditorAction({ type: `list-${listStyle}` as PayloadType, checked: value === listStyle }, icon),
  );

export const mountLists = (graph: Graph, state: EditorToolbarState): [ToolbarActionGroup, () => void] => {
  const unsubscribe = effect(() => {
    const value = state.listStyle ?? '';
    const listGroupAction = createListGroupAction(value);
    const listActionsMap = createListActions(value);
    // @ts-ignore
    graph._addNodes([listGroupAction as NodeArg<any>, ...listActionsMap]);
    // @ts-ignore
    graph._addEdges(listActionsMap.map(({ id }) => ({ source: listGroupAction.id, target: id })));
  });
  return [graph.findNode('list') as ToolbarActionGroup, unsubscribe];
};
