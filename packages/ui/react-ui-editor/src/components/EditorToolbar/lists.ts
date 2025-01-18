//
// Copyright 2025 DXOS.org
//

import { type NodeArg } from '@dxos/app-graph';
import { type ToolbarActionGroupProperties } from '@dxos/react-ui-menu';

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

export const createLists = (state: EditorToolbarState) => {
  const value = state.listStyle ?? '';
  const listGroupAction = createListGroupAction(value);
  const listActionsMap = createListActions(value);
  return {
    nodes: [listGroupAction as NodeArg<any>, ...listActionsMap],
    edges: [
      { source: 'root', target: 'list' },
      ...listActionsMap.map(({ id }) => ({ source: listGroupAction.id, target: id })),
    ],
  };
};
