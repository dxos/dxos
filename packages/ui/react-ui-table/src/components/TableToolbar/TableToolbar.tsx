//
// Copyright 2024 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import React, { useMemo } from 'react';

import { live } from '@dxos/live-object';
import { type ThemedClassName } from '@dxos/react-ui';
import {
  type ActionGraphEdges,
  type ActionGraphNodes,
  type ActionGraphProps,
  createGapSeparator,
  createMenuAction,
  type MenuAction,
  MenuProvider,
  ToolbarMenu,
  useMenuActions,
} from '@dxos/react-ui-menu';
import { rxFromSignal } from '@dxos/react-ui-menu';

import { translationKey } from '../../translations';

export type TableToolbarActionProperties = { type: TableToolbarActionType };

export type TableToolbarAction = MenuAction<TableToolbarActionProperties>;

export type TableToolbarActionType = 'add-row' | 'comment' | 'save-view';

type TableToolbarState = Partial<{ viewDirty: boolean }>;

export type TableToolbarProps = ThemedClassName<
  TableToolbarState & {
    onAdd: () => void;
    onSave: () => void;
    attendableId?: string;
    customActions?: Rx.Rx<ActionGraphProps>;
  }
>;

const createTableToolbarActions = ({
  state,
  onAdd,
  onSave,
  customActions,
}: {
  state: TableToolbarState;
  onAdd: () => void;
  onSave: () => void;
  customActions?: Rx.Rx<ActionGraphProps>;
}) =>
  Rx.make((get) => {
    const add = createMenuAction<TableToolbarActionProperties>('add-row', onAdd, {
      type: 'add-row' as const,
      icon: 'ph--plus--regular',
      label: ['add row', { ns: translationKey }],
      testId: 'table.toolbar.add-row',
    });
    const save = createMenuAction<TableToolbarActionProperties>('save-view', onSave, {
      type: 'save-view' as const,
      icon: 'ph--floppy-disk--regular',
      label: ['save view label', { ns: translationKey }],
      testId: 'table.toolbar.save-view',
      iconOnly: false,
      hidden: get(rxFromSignal(() => !state.viewDirty)),
    });
    const gap = createGapSeparator();
    const nodes: ActionGraphNodes = [add, save, ...gap.nodes];
    const edges: ActionGraphEdges = nodes.map(({ id: target }) => ({ source: 'root', target }));
    if (customActions) {
      const custom = get(customActions);
      nodes.push(...custom.nodes);
      edges.push(...custom.edges);
    }
    return {
      nodes,
      edges,
    };
  });

export const TableToolbar = ({
  classNames,
  viewDirty,
  attendableId,
  onAdd,
  onSave,
  customActions,
}: TableToolbarProps) => {
  const state = useMemo(() => live<TableToolbarState>({ viewDirty }), []);
  const actionsCreator = useMemo(
    () => createTableToolbarActions({ state, onAdd, onSave, customActions }),
    [state, onAdd, onSave, customActions],
  );
  const menu = useMenuActions(actionsCreator);

  return (
    <MenuProvider {...menu} attendableId={attendableId}>
      <ToolbarMenu classNames={classNames} />
    </MenuProvider>
  );
};
