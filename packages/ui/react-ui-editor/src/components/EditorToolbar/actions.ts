//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { type Node } from '@dxos/app-graph';
import {
  type MenuItemGroup,
  type ToolbarMenuActionGroupProperties,
  createMenuAction,
  createMenuItemGroup,
} from '@dxos/react-ui-menu';
import { List, addList, removeList } from '@dxos/ui-editor';
import { type MenuActionProperties } from '@dxos/ui-types';

import { translationKey } from '../../translations';

import { type EditorToolbarState } from './useEditorToolbar';

const listStyles = {
  bullet: 'ph--list-bullets--regular',
  ordered: 'ph--list-numbers--regular',
  task: 'ph--list-checks--regular',
};

export const createLists = (state: EditorToolbarState, getView: () => EditorView) => {
  const value = state.listStyle ?? '';
  const listGroupAction = createListGroupAction(value);
  const listActionsMap = createListActions(value, getView);
  return {
    nodes: [listGroupAction as Node.NodeArg<any>, ...listActionsMap],
    edges: [
      { source: 'root', target: 'list' },
      ...listActionsMap.map(({ id }) => ({ source: listGroupAction.id, target: id })),
    ],
  };
};

export const createEditorAction = (id: string, props: Partial<MenuActionProperties>, invoke: () => void) => {
  const { label = [`${id} label`, { ns: translationKey }], ...rest } = props;

  return createMenuAction(id, invoke, {
    label,
    ...rest,
  }) as Node.Action<MenuActionProperties>;
};

export const createEditorActionGroup = (
  id: string,
  props: Omit<ToolbarMenuActionGroupProperties, 'icon'>,
  icon?: string,
): MenuItemGroup<ToolbarMenuActionGroupProperties> => {
  const { label = [`${id} label`, { ns: translationKey }], ...rest } = props;

  return createMenuItemGroup(id, {
    label,
    icon,
    iconOnly: true,
    ...rest,
  }) as MenuItemGroup<ToolbarMenuActionGroupProperties>;
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
    return createEditorAction(`list-${listStyle}`, { checked, icon }, () => {
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
    });
  });
