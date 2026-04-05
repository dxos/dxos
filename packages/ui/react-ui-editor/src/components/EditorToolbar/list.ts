//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { type Node } from '@dxos/app-graph';
import { createMenuItemGroup } from '@dxos/react-ui-menu';
import { List, addList, removeList } from '@dxos/ui-editor';

import { translationKey } from '../../translations';

import { type EditorToolbarState } from './useEditorToolbar';
import { createEditorMenuAction } from './actions';

const list = {
  bullet: 'ph--list-bullets--regular',
  ordered: 'ph--list-numbers--regular',
  task: 'ph--list-checks--regular',
};

const createListActionGroup = (value: string) =>
  createMenuItemGroup('list', {
    label: ['list.label', { ns: translationKey }],
    iconOnly: true,
    variant: 'toggleGroup',
    selectCardinality: 'single',
    value,
  });

const createListActions = (value: string, getView: () => EditorView) =>
  Object.entries(list).map(([style, icon]) => {
    const checked = value === style;
    return createEditorMenuAction(`list.${style}`, { checked, icon }, () => {
      const view = getView();
      if (!view) {
        return;
      }

      const listType = style === 'ordered' ? List.Ordered : style === 'bullet' ? List.Bullet : List.Task;
      if (checked) {
        removeList(listType)(view);
      } else {
        addList(listType)(view);
      }
    });
  });

export const createLists = (state: EditorToolbarState, getView: () => EditorView) => {
  const value = state.listStyle ?? '';
  const listActionsMap = createListActions(value, getView);
  const listGroupAction = createListActionGroup(value);
  return {
    nodes: [listGroupAction as Node.NodeArg<any>, ...listActionsMap],
    edges: [
      { source: 'root', target: 'list', relation: 'child' },
      ...listActionsMap.map(({ id }) => ({ source: listGroupAction.id, target: id, relation: 'child' })),
    ],
  };
};
