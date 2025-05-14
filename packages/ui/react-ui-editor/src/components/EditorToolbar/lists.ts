//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { type NodeArg } from '@dxos/app-graph';
import { type ToolbarMenuActionGroupProperties } from '@dxos/react-ui-menu';

import { createEditorAction, createEditorActionGroup, type EditorToolbarState } from './util';
import { addList, List, removeList } from '../../extensions';

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
  } as ToolbarMenuActionGroupProperties);

const createListActions = (value: string, getView: () => EditorView) =>
  Object.entries(listStyles).map(([listStyle, icon]) => {
    const checked = value === listStyle;
    return createEditorAction(
      `list-${listStyle}`,
      () => {
        const view = getView();
        if (!view) {
          return;
        }

        const listType = listStyle === 'ordered' ? List.Ordered : listStyle === 'bullet' ? List.Bullet : List.Task;
        if (checked) {
          removeList(listType)(view);
        } else {
          addList(listType)(view);
        }
      },
      { checked, icon },
    );
  });

export const createLists = (state: EditorToolbarState, getView: () => EditorView) => {
  const value = state.listStyle ?? '';
  const listGroupAction = createListGroupAction(value);
  const listActionsMap = createListActions(value, getView);
  return {
    nodes: [listGroupAction as NodeArg<any>, ...listActionsMap],
    edges: [
      { source: 'root', target: 'list' },
      ...listActionsMap.map(({ id }) => ({ source: listGroupAction.id, target: id })),
    ],
  };
};
