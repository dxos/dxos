//
// Copyright 2024 DXOS.org
//

import { Atom, RegistryContext } from '@effect-atom/atom-react';
import React, { useContext, useEffect, useMemo } from 'react';

import { composable, composableProps } from '@dxos/react-ui';
import {
  type ActionGraphEdges,
  type ActionGraphNodes,
  type ActionGraphProps,
  Menu,
  type MenuAction,
  MenuRootProps,
  createGapSeparator,
  createMenuAction,
  createMenuItemGroup,
  useMenuActions,
} from '@dxos/react-ui-menu';

import { translationKey } from '#translations';

export type TableToolbarActionProperties = { type: TableToolbarActionType };

export type TableToolbarAction = MenuAction<TableToolbarActionProperties>;

export type TableToolbarActionType = 'add-row' | 'comment' | 'save-view' | 'export-csv' | 'export-json' | 'export-xml';

export type TableExportFormat = 'csv' | 'json' | 'xml';

type TableToolbarState = Partial<{ viewDirty: boolean }>;

const createTableToolbarActions = ({
  stateAtom,
  onAdd,
  onSave,
  onExport,
  customActions,
}: {
  stateAtom: Atom.Atom<TableToolbarState>;
  onAdd?: () => void;
  onSave?: () => void;
  onExport?: (format: TableExportFormat) => void;
  customActions?: Atom.Atom<ActionGraphProps>;
}) =>
  Atom.make((get) => {
    const nodes: ActionGraphNodes = [];
    const edges: ActionGraphEdges = [];
    if (onAdd) {
      const add = createMenuAction<TableToolbarActionProperties>('add-row', onAdd, {
        type: 'add-row' as const,
        icon: 'ph--plus--regular',
        label: ['add-row.label', { ns: translationKey }],
        testId: 'table.toolbar.add-row',
      });
      nodes.push(add);
      edges.push({ source: 'root', target: add.id, relation: 'child' });
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
      edges.push({ source: 'root', target: save.id, relation: 'child' });
    }
    if (onExport) {
      const exportGroup = createMenuItemGroup('export-rows', {
        label: ['export-rows.menu', { ns: translationKey }],
        icon: 'ph--export--regular',
        iconOnly: true,
        variant: 'dropdownMenu',
      });
      nodes.push(exportGroup);
      edges.push({ source: 'root', target: exportGroup.id, relation: 'child' });

      const formats: Array<{ format: TableExportFormat; type: TableToolbarActionType; label: string }> = [
        { format: 'csv', type: 'export-csv', label: 'export-rows-csv.menu' },
        { format: 'json', type: 'export-json', label: 'export-rows-json.menu' },
        { format: 'xml', type: 'export-xml', label: 'export-rows-xml.menu' },
      ];
      for (const { format, type, label } of formats) {
        const action = createMenuAction<TableToolbarActionProperties>(type, () => onExport(format), {
          type,
          label: [label, { ns: translationKey }],
        });
        nodes.push(action);
        edges.push({ source: exportGroup.id, target: action.id, relation: 'child' });
      }
    }
    const gap = createGapSeparator();
    nodes.push(...gap.nodes);
    edges.push(...gap.edges);
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
    onExport?: (format: TableExportFormat) => void;
    customActions?: Atom.Atom<ActionGraphProps>;
  };

export const TableToolbar = composable<HTMLDivElement, TableToolbarProps>(
  ({ attendableId, viewDirty, onAdd, onSave, onExport, customActions, ...props }, forwardedRef) => {
    const registry = useContext(RegistryContext);
    const stateAtom = useMemo(() => Atom.make<TableToolbarState>({ viewDirty }), []);

    // Update state.viewDirty when the prop changes.
    useEffect(() => {
      registry.set(stateAtom, { viewDirty });
    }, [registry, stateAtom, viewDirty]);

    const actionsCreator = useMemo(
      () => createTableToolbarActions({ stateAtom, onAdd, onSave, onExport, customActions }),
      [stateAtom, onAdd, onSave, onExport, customActions],
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
