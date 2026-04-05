//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import {
  type ActionGroupBuilderFn,
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

/** Add list actions to the builder. */
export const addLists =
  (state: EditorToolbarState, getView: () => EditorView): ActionGroupBuilderFn =>
  (builder) => {
    const value = state.listStyle ?? '';
    builder.group(
      'list',
      {
        label: ['list.label', { ns: translationKey }],
        iconOnly: true,
        variant: 'toggleGroup',
        selectCardinality: 'single',
        value,
      } as ToolbarMenuActionGroupProperties,
      (group) => {
        for (const [listStyle, icon] of Object.entries(listStyles)) {
          const checked = value === listStyle;
          group.action(
            `list-${listStyle}`,
            { label: [`list.${listStyle}.label`, { ns: translationKey }], checked, icon },
            () => {
              const view = getView();
              if (!view) {
                return;
              }

              const listType =
                listStyle === 'ordered' ? List.Ordered : listStyle === 'bullet' ? List.Bullet : List.Task;
              if (checked) {
                removeList(listType)(view);
              } else {
                addList(listType)(view);
              }
            },
          );
        }
      },
    );
  };

export const createEditorAction = (id: string, props: Partial<MenuActionProperties>, invoke: () => void) => {
  const { label = [`${id} label`, { ns: translationKey }], ...rest } = props;

  return createMenuAction(id, invoke, {
    label,
    ...rest,
  });
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
