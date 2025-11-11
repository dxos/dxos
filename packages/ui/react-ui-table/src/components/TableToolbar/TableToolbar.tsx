//
// Copyright 2024 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { useMemo } from 'react';

import { live } from '@dxos/live-object';
import { type ThemedClassName } from '@dxos/react-ui';
import {
  type ActionGraphEdges,
  type ActionGraphNodes,
  type ActionGraphProps,
  type MenuAction,
  MenuProvider,
  ToolbarMenu,
  createGapSeparator,
  createMenuAction,
  useMenuActions,
} from '@dxos/react-ui-menu';
import { atomFromSignal } from '@dxos/react-ui-menu';

import { translationKey } from '../../translations';

export type TableToolbarActionProperties = { type: TableToolbarActionType };

export type TableToolbarAction = MenuAction<TableToolbarActionProperties>;

export type TableToolbarActionType = 'add-row' | 'comment' | 'save-view';

type TableToolbarState = Partial<{ viewDirty: boolean }>;

// TODO(burdon): Radix style layout.

export type TableToolbarProps = ThemedClassName<
  TableToolbarState & {
    onAdd: () => void;
    onSave: () => void;
    attendableId?: string;
    customActions?: Atom.Atom<ActionGraphProps>;
  }
>;

const createTableToolbarActions = ({
  state,
  onAdd,
  onSave,
  customActions,
}: {
  state: TableToolbarState;
  onAdd?: () => void;
  onSave?: () => void;
  customActions?: Atom.Atom<ActionGraphProps>;
}) =>
  Atom.make((get) => {
    const nodes: ActionGraphNodes = [];
    if (onAdd) {
      const add = createMenuAction<TableToolbarActionProperties>('add-row', onAdd, {
        type: 'add-row' as const,
        icon: 'ph--plus--regular',
        label: ['add row', { ns: translationKey }],
        testId: 'table.toolbar.add-row',
      });
      nodes.push(add);
    }
    if (onSave) {
      const save = createMenuAction<TableToolbarActionProperties>('save-view', onSave, {
        type: 'save-view' as const,
        icon: 'ph--floppy-disk--regular',
        label: ['save view label', { ns: translationKey }],
        testId: 'table.toolbar.save-view',
        iconOnly: false,
        hidden: get(atomFromSignal(() => !state.viewDirty)),
      });
      nodes.push(save);
    }
    const gap = createGapSeparator();
    nodes.push(...gap.nodes);
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
