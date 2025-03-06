//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { create } from '@dxos/live-object';
import { type ThemedClassName } from '@dxos/react-ui';
import {
  createGapSeparator,
  createMenuAction,
  type MenuAction,
  type MenuActionHandler,
  MenuProvider,
  ToolbarMenu,
  useMenuActions,
} from '@dxos/react-ui-menu';

import { translationKey } from '../../translations';

export type TableToolbarActionProperties = { type: TableToolbarActionType };

export type TableToolbarAction = MenuAction<TableToolbarActionProperties>;

export type TableToolbarActionType = 'add-row' | 'comment' | 'save-view';

type TableToolbarState = Partial<{ viewDirty: boolean }>;

export type TableToolbarProps = ThemedClassName<
  TableToolbarState & { onAction?: MenuActionHandler<TableToolbarAction>; attendableId?: string }
>;

const createTableToolbarActions = (state: TableToolbarState) => {
  const add = createMenuAction<TableToolbarActionProperties>('add-row', {
    type: 'add-row',
    icon: 'ph--plus--regular',
    label: ['add row', { ns: translationKey }],
    testId: 'table.toolbar.add-row',
  });
  const save = createMenuAction<TableToolbarActionProperties>('save-view', {
    type: 'save-view',
    icon: 'ph--floppy-disk--regular',
    label: ['save view label', { ns: translationKey }],
    testId: 'table.toolbar.save-view',
    iconOnly: false,
    hidden: !state.viewDirty,
  });
  const gap = createGapSeparator();
  const comment = createMenuAction('comment', {
    type: 'comment',
    icon: 'ph--chat-text--regular',
    label: ['create comment', { ns: translationKey }],
    testId: 'table.toolbar.comment',
  });
  const nodes = [add, save, ...gap.nodes, comment];
  return {
    nodes,
    edges: nodes.map(({ id: target }) => ({ source: 'root', target })),
  };
};

export const TableToolbar = ({ classNames, viewDirty, attendableId, onAction }: TableToolbarProps) => {
  const state = useMemo(() => create<TableToolbarState>({ viewDirty }), []);
  const actionsCreator = useCallback(() => createTableToolbarActions(state), [state]);
  const menu = useMenuActions(actionsCreator);

  return (
    <MenuProvider {...menu} attendableId={attendableId} onAction={onAction as MenuActionHandler}>
      <ToolbarMenu classNames={classNames} />
    </MenuProvider>
  );
};
