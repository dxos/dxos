//
// Copyright 2023 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { type Instruction, extractInstruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { untracked } from '@preact/signals-core';
import React, { memo, useCallback, useEffect, useMemo } from 'react';

import {
  LayoutAction,
  Surface,
  createIntent,
  useAppGraph,
  useCapability,
  useIntentDispatcher,
  useLayout,
} from '@dxos/app-framework';
import { type Node, ROOT_ID, type ReadableGraph, isAction, isActionLike } from '@dxos/app-graph';
import { PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { useConnections, useActions as useGraphActions } from '@dxos/plugin-graph';
import { useMediaQuery, useSidebars } from '@dxos/react-ui';
import { type TreeData, type TreeItemDataProps, isTreeData } from '@dxos/react-ui-list';
import { mx } from '@dxos/react-ui-theme';
import { arrayMove, byPosition } from '@dxos/util';

import { NavTreeCapabilities } from '../capabilities';
import { meta } from '../meta';
import { type FlattenedActions, type NavTreeItemGraphNode } from '../types';
import { getChildren, getParent, resolveMigrationOperation } from '../util';

import { NAV_TREE_ITEM, NavTree } from './NavTree';
import { NavTreeContext } from './NavTreeContext';
import { type NavTreeContextValue } from './types';

// TODO(thure): Is NavTree truly authoritative in this regard?
export const NODE_TYPE = 'dxos/app-graph/node';

const renderItemEnd = ({ node, open }: { node: Node; open: boolean }) => (
  <Surface role='navtree-item-end' data={{ id: node.id, subject: node.data, open }} limit={1} />
);

const getChildrenFilter = (node: Node): node is Node =>
  untracked(
    () => !isActionLike(node) && node.type !== PLANK_COMPANION_TYPE && node.properties.disposition !== 'hidden',
  );

const filterItems = (node: Node, disposition?: string) => {
  if (!disposition && (node.properties.disposition === 'hidden' || node.properties.disposition === 'alternate-tree')) {
    return false;
  } else if (!disposition) {
    const action = isAction(node);
    return !action || node.properties.disposition === 'item';
  } else {
    return node.properties.disposition === disposition;
  }
};

const getItems = (graph: ReadableGraph, node?: Node, disposition?: string) => {
  return graph.getConnections(node?.id ?? ROOT_ID, 'outbound').filter((node) => filterItems(node, disposition));
};

const useItems = (node?: Node, options?: { disposition?: string; sort?: boolean }) => {
  const { graph } = useAppGraph();
  const connections = useConnections(graph, node?.id ?? ROOT_ID);
  const filtered = connections.filter((node) => filterItems(node, options?.disposition));
  return options?.sort ? filtered.toSorted((a, b) => byPosition(a.properties, b.properties)) : filtered;
};

const useActions = (node: Node): FlattenedActions => {
  const { graph } = useAppGraph();
  const actions = useGraphActions(graph, node.id);

  return useMemo(
    () =>
      actions.reduce(
        (acc: FlattenedActions, arg) => {
          if (arg.properties.disposition === 'item') {
            return acc;
          }

          acc.actions.push(arg);
          if (!isAction(arg)) {
            const actionGroup = graph.getActions(arg.id);
            acc.groupedActions[arg.id] = actionGroup;
          }
          return acc;
        },
        { actions: [], groupedActions: {} },
      ),
    [actions],
  );
};

export type NavTreeContainerProps = {
  popoverAnchorId?: string;
  topbar?: boolean;
} & Pick<NavTreeContextValue, 'tab'>;

export const NavTreeContainer = memo(({ tab, popoverAnchorId, topbar }: NavTreeContainerProps) => {
  const [isLg] = useMediaQuery('lg', { ssr: false });
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const { graph } = useAppGraph();
  const { isOpen, isCurrent, isAlternateTree, setItem } = useCapability(NavTreeCapabilities.State);
  const layout = useLayout();
  const { navigationSidebarState } = useSidebars(meta.id);

  const getProps = useCallback(
    (node: Node, path: string[]): TreeItemDataProps => {
      const children = getChildren(graph, node, path).filter(getChildrenFilter);
      const parentOf =
        children.length > 0 ? children.map(({ id }) => id) : node.properties.role === 'branch' ? [] : undefined;
      return {
        id: node.id,
        parentOf,
        disabled: node.properties.disabled,
        label: node.properties.label ?? node.id,
        className: mx(node.properties.className, node.properties.modified && 'italic'), // TODO(burdon): Italic?
        headingClassName: node.properties.headingClassName,
        icon: node.properties.icon,
        iconClassName: node.properties.iconClassName,
        testId: node.properties.testId,
      };
    },
    [graph],
  );

  const loadDescendents = useCallback(
    (node: Node) => {
      graph.expand(node.id, 'outbound');
      // Load one level deeper, which resolves some juddering observed on open/close.
      graph.getConnections(node.id, 'outbound').forEach((child) => {
        graph.expand(child.id, 'outbound');
      });
    },
    [graph],
  );

  const handleOpenChange = useCallback(
    ({ item: { id }, path, open }: { item: Node; path: string[]; open: boolean }) => {
      // TODO(thure): This might become a localstorage leak; openItemIds that no longer exist should be removed from this map.
      setItem(path, 'open', open);
      graph.expand(id, 'outbound');
    },
    [graph],
  );

  const handleTabChange = useCallback(
    async (node: NavTreeItemGraphNode) => {
      await dispatch(
        createIntent(LayoutAction.UpdateSidebar, {
          part: 'sidebar',
          options: {
            state:
              node.id === tab
                ? navigationSidebarState === 'expanded'
                  ? isLg
                    ? 'collapsed'
                    : 'closed'
                  : 'expanded'
                : 'expanded',
          },
        }),
      );

      await dispatch(createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: node.id }));

      // Open the first item if the workspace is empty.
      if (layout.active.length === 0) {
        const [item] = getItems(graph, node).filter((node) => !isActionLike(node));
        if (item && item.data) {
          await dispatch(createIntent(LayoutAction.Open, { part: 'main', subject: [item.id] }));
        }
      }
    },
    [dispatch, layout.active, tab, navigationSidebarState, isLg],
  );

  const canDrop = useCallback(({ source, target }: { source: TreeData; target: TreeData }) => {
    return target.item.properties.canDrop?.(source) ?? false;
  }, []);

  const handleSelect = useCallback(
    ({ item: node, path, option }: { item: Node; path: string[]; option: boolean }) => {
      if (!node.data) {
        return;
      }

      if (isAction(node)) {
        const [parent] = graph.getConnections(node.id, 'inbound');
        void (parent && node.data({ parent, caller: NAV_TREE_ITEM }));
        return;
      }

      const current = isCurrent(path, node);
      if (!current) {
        void dispatch(
          createIntent(LayoutAction.Open, {
            part: 'main',
            subject: [node.id],
            options: { key: node.properties.key },
          }),
        );
      } else if (option) {
        void dispatch(
          createIntent(LayoutAction.Close, { part: 'main', subject: [node.id], options: { state: false } }),
        );
      } else {
        void dispatch(createIntent(LayoutAction.ScrollIntoView, { part: 'current', subject: node.id }));
      }

      const defaultAction = graph.getActions(node.id).find((action) => action.properties?.disposition === 'default');
      if (isAction(defaultAction)) {
        void (defaultAction.data as () => void)();
      }

      if (!isLg) {
        void dispatch(createIntent(LayoutAction.UpdateSidebar, { part: 'sidebar', options: { state: 'closed' } }));
      }
    },
    [graph, dispatch, isCurrent, isLg],
  );

  const handleBack = useCallback(
    () => dispatch(createIntent(LayoutAction.RevertWorkspace, { part: 'workspace', options: { revert: true } })),
    [dispatch],
  );

  // TODO(wittjosiah): Factor out hook.
  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => isTreeData(source.data),
      onDrop: ({ location, source }) => {
        // Didn't drop on anything.
        if (!location.current.dropTargets.length) {
          return;
        }
        const target = location.current.dropTargets[0];
        const instruction: Instruction | null = extractInstruction(target.data);
        if (instruction !== null && instruction.type !== 'instruction-blocked') {
          const sourceNode = source.data.item as NavTreeItemGraphNode;
          const targetNode = target.data.item as NavTreeItemGraphNode;
          const sourcePath = source.data.path as string[];
          const targetPath = target.data.path as string[];
          const operation =
            sourcePath.slice(0, -1).join() === targetPath.slice(0, -1).join() && instruction.type !== 'make-child'
              ? 'rearrange'
              : resolveMigrationOperation(graph, sourceNode, targetPath, targetNode);
          const sourceParent = getParent(graph, sourceNode, sourcePath);
          const targetParent = getParent(graph, targetNode, targetPath);
          const sourceItems = getItems(graph, sourceParent);
          const targetItems = getItems(graph, targetParent);
          const sourceIndex = sourceItems.findIndex(({ id }) => id === sourceNode.id);
          const targetIndex = targetItems.findIndex(({ id }) => id === targetNode.id);
          const migrationIndex =
            instruction.type === 'make-child'
              ? undefined
              : instruction.type === 'reorder-below'
                ? targetIndex + 1
                : targetIndex;
          switch (operation) {
            case 'rearrange': {
              const nextItems = sourceItems.map(({ data }) => data);
              arrayMove(nextItems, sourceIndex, targetIndex);
              void sourceParent?.properties.onRearrangeChildren?.(nextItems);
              break;
            }
            case 'copy': {
              const target = instruction.type === 'make-child' ? targetNode : targetParent;
              void target?.properties.onCopy?.(sourceNode, migrationIndex);
              break;
            }
            case 'transfer': {
              const target = instruction.type === 'make-child' ? targetNode : targetParent;
              if (!target?.properties.onTransferStart || !sourceParent?.properties.onTransferEnd) {
                break;
              }
              void target?.properties.onTransferStart(sourceNode, migrationIndex);
              void sourceParent?.properties.onTransferEnd?.(sourceNode, target);
              break;
            }
          }
        }
      },
    });
  }, [graph]);

  const setAlternateTree = useCallback(
    (path: string[], open: boolean) => {
      setItem(path, 'alternateTree', open);
    },
    [setItem],
  );

  const navTreeContextValue = useMemo(
    () => ({
      useItems,
      tab,
      useActions,
      loadDescendents,
      renderItemEnd,
      popoverAnchorId,
      topbar,
      getProps,
      isCurrent,
      isOpen,
      canDrop,
      isAlternateTree,
      setAlternateTree,
      onTabChange: handleTabChange,
      onOpenChange: handleOpenChange,
      onSelect: handleSelect,
      onBack: handleBack,
    }),
    [
      tab,
      useActions,
      loadDescendents,
      renderItemEnd,
      popoverAnchorId,
      topbar,
      getProps,
      isCurrent,
      isOpen,
      canDrop,
      isAlternateTree,
      setAlternateTree,
      handleTabChange,
      handleOpenChange,
      handleSelect,
      handleBack,
    ],
  );

  return (
    <NavTreeContext.Provider value={navTreeContextValue}>
      <NavTree id={ROOT_ID} root={graph.root} open={layout.sidebarOpen} />
    </NavTreeContext.Provider>
  );
});
