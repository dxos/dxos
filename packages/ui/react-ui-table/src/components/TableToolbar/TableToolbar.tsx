//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { live } from '@dxos/live-object';
import { type ThemedClassName } from '@dxos/react-ui';
import {
  createGapSeparator,
  createMenuAction,
  type MenuAction,
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
  TableToolbarState & {
    onAction: (action: TableToolbarAction) => void;
    attendableId?: string;
    ignoreAttention?: boolean;
  }
>;

const createTableToolbarActions = (state: TableToolbarState, onAction: (action: TableToolbarAction) => void) => {
  const add = createMenuAction<TableToolbarActionProperties>('add-row', () => onAction(add), {
    type: 'add-row' as const,
    icon: 'ph--plus--regular',
    label: ['add row', { ns: translationKey }],
    testId: 'table.toolbar.add-row',
  });
  const save = createMenuAction<TableToolbarActionProperties>('save-view', () => onAction(save), {
    type: 'save-view' as const,
    icon: 'ph--floppy-disk--regular',
    label: ['save view label', { ns: translationKey }],
    testId: 'table.toolbar.save-view',
    iconOnly: false,
    hidden: !state.viewDirty,
  });
  const gap = createGapSeparator();
  const comment = createMenuAction('comment', () => onAction(comment), {
    type: 'comment' as const,
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

export const TableToolbar = ({ classNames, viewDirty, attendableId, onAction, ignoreAttention }: TableToolbarProps) => {
  const state = useMemo(() => live<TableToolbarState>({ viewDirty }), []);
  const actionsCreator = useCallback(() => createTableToolbarActions(state, onAction), [state, onAction]);
  const menu = useMenuActions(actionsCreator);

  return (
    <MenuProvider {...menu} attendableId={attendableId}>
      <ToolbarMenu classNames={classNames} ignoreAttention={ignoreAttention} />
    </MenuProvider>
  );
};
