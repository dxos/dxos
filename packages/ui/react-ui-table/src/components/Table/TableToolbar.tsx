//
// Copyright 2024 DXOS.org
//

import { Atom, RegistryContext } from '@effect-atom/atom-react';
import React, { useContext, useEffect, useMemo } from 'react';

import {
  type ActionGraphEdges,
  type ActionGraphNodes,
  type ActionGraphProps,
  Menu,
  type MenuAction,
  MenuRootProps,
  createGapSeparator,
  createMenuAction,
  useMenuActions,
} from '@dxos/react-ui-menu';
import { composable, composableProps } from '@dxos/ui-theme';

import { translationKey } from '../../translations';

export type TableToolbarActionProperties = { type: TableToolbarActionType };

export type TableToolbarAction = MenuAction<TableToolbarActionProperties>;

export type TableToolbarActionType = 'add-row' | 'comment' | 'save-view';

type TableToolbarState = Partial<{ viewDirty: boolean }>;

const createTableToolbarActions = ({
  stateAtom,
  onAdd,
  onSave,
  customActions,
}: {
  stateAtom: Atom.Atom<TableToolbarState>;
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
        label: ['add-row.label', { ns: translationKey }],
        testId: 'table.toolbar.add-row',
      });
      nodes.push(add);
    }
    if (onSave) {
      const state = get(stateAtom);
      const save = createMenuAction<TableToolbarActionProperties>('save-view', onSave, {
        type: 'save-view' as const,
        icon: 'ph--floppy-disk--regular',
        label: ['save-view.label', { ns: translationKey }],
        testId: 'table.toolbar.save-view',
        iconOnly: false,
        hidden: !state.viewDirty,
      });
      nodes.push(save);
    }
    const gap = createGapSeparator();
    nodes.push(...gap.nodes);
    const edges: ActionGraphEdges = nodes.map(({ id: target }) => ({ source: 'root', target, relation: 'child' }));
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

export type TableToolbarProps = Pick<MenuRootProps, 'attendableId'> &
  TableToolbarState & {
    onAdd?: () => void;
    onSave?: () => void;
    customActions?: Atom.Atom<ActionGraphProps>;
  };

export const TableToolbar = composable<HTMLDivElement, TableToolbarProps>(
  ({ attendableId, viewDirty, onAdd, onSave, customActions, ...props }, forwardedRef) => {
    const registry = useContext(RegistryContext);
    const stateAtom = useMemo(() => Atom.make<TableToolbarState>({ viewDirty }), []);

    // Update state.viewDirty when the prop changes.
    useEffect(() => {
      registry.set(stateAtom, { viewDirty });
    }, [registry, stateAtom, viewDirty]);

    const actionsCreator = useMemo(
      () => createTableToolbarActions({ stateAtom, onAdd, onSave, customActions }),
      [stateAtom, onAdd, onSave, customActions],
    );
    const menuActions = useMenuActions(actionsCreator);

    return (
      <Menu.Root {...menuActions} attendableId={attendableId}>
        <Menu.Toolbar {...composableProps(props)} ref={forwardedRef} />
      </Menu.Root>
    );
  },
);

TableToolbar.displayName = 'TableToolbar';
