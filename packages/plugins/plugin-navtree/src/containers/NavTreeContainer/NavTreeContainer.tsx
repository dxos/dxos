//
// Copyright 2023 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { type Instruction, extractInstruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import React, { forwardRef, memo, useCallback, useEffect, useMemo, useRef } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { useAppGraph, useLayout } from '@dxos/app-toolkit/ui';
import { Graph, Node, useActionRunner } from '@dxos/plugin-graph';
import { useMediaQuery, useSidebars } from '@dxos/react-ui';
import { type TreeData, isTreeData } from '@dxos/react-ui-list';
import { arrayMove } from '@dxos/util';

import { NAV_TREE_ITEM, NavTree, NavTreeContext } from '#components';
import { useNavTreeModel, useNavTreeState } from '#hooks';
import { meta } from '#meta';
import { type NavTreeItemGraphNode } from '#types';
import { filterItems, getParent, resolveMigrationOperation } from '../../util';

// TODO(thure): Is NavTree truly authoritative in this regard?
export const NODE_TYPE = 'dxos/app-graph/node';

// TODO(wittjosiah): Avoid using Surface within the navtree, prefer declarative data flow.
const NavTreeItemEnd = ({ node, open }: { node: Node.Node; open: boolean }) => {
  const data = useMemo(() => ({ id: node.id, subject: node.data, open }), [node.id, node.data, open]);
  return <Surface.Surface role='navtree-item-end' data={data} limit={1} />;
};

const getItems = (graph: Graph.ReadableGraph, node?: Node.Node, disposition?: string) => {
  return Graph.getConnections(graph, node?.id ?? Node.RootId, 'child').filter((node) => filterItems(node, disposition));
};

export type NavTreeContainerProps = {
  popoverAnchorId?: string;
  tab: string;
};

export const NavTreeContainer$ = forwardRef<HTMLDivElement, NavTreeContainerProps>(
  ({ tab, popoverAnchorId }, forwardedRef) => {
    const [isLg] = useMediaQuery('lg');
    const { invokePromise } = useOperationInvoker();
    const runAction = useActionRunner();
    const { graph } = useAppGraph();
    const { getItem, setItem } = useNavTreeState();
    const layout = useLayout();
    const model = useNavTreeModel(Node.RootId);
    const { navigationSidebarState } = useSidebars(meta.id);
    const latestRef = useRef({
      tab,
      activeItems: layout.active,
      navigationSidebarState,
      isLg,
    });

    useEffect(() => {
      latestRef.current = {
        tab,
        activeItems: layout.active,
        navigationSidebarState,
        isLg,
      };
    }, [tab, layout.active, navigationSidebarState, isLg]);

    const handleOpenChange = useCallback(
      ({ item: { id }, path, open }: { item: Node.Node; path: string[]; open: boolean }) => {
        // TODO(thure): This might become a localstorage leak; openItemIds that no longer exist should be removed from this map.
        setItem(path, 'open', open);
        Graph.expand(graph, id, 'child');
      },
      [graph, setItem],
    );

    const handleTabChange = useCallback(
      (node: NavTreeItemGraphNode) => {
        Graph.expand(graph, node.id, 'child');

        const {
          tab: activeTab,
          activeItems,
          navigationSidebarState: currentSidebarState,
          isLg: latestIsLg,
        } = latestRef.current;
        void invokePromise(LayoutOperation.UpdateSidebar, {
          state:
            node.id === activeTab
              ? currentSidebarState === 'expanded'
                ? latestIsLg
                  ? 'collapsed'
                  : 'closed'
                : 'expanded'
              : 'expanded',
        });

        void invokePromise(LayoutOperation.SwitchWorkspace, { subject: node.id });

        // Open the first item if the workspace is empty.
        if (activeItems.length === 0) {
          const [item] = getItems(graph, node).filter((node) => !Node.isActionLike(node));
          if (item && item.data) {
            if (layout.mode === 'multi') {
              void invokePromise(LayoutOperation.Set, { subject: [item.id] });
            } else {
              void invokePromise(LayoutOperation.Open, { subject: [item.id] });
            }
          }
        }
      },
      [invokePromise, graph, layout.mode],
    );

    const blockInstruction = useCallback(
      ({ instruction, source, target }: { instruction: Instruction; source: TreeData; target: TreeData }) => {
        return target.item.properties.blockInstruction?.(source, instruction) ?? false;
      },
      [],
    );

    const canDrop = useCallback(({ source, target }: { source: TreeData; target: TreeData }) => {
      return target.item.properties.canDrop?.(source) ?? false;
    }, []);

    const canSelect = useCallback(({ item }: { item: Node.Node }) => {
      return item.properties.selectable ?? true;
    }, []);

    const handleSelect = useCallback(
      ({ item: node, path, option }: { item: Node.Node; path: string[]; option: boolean }) => {
        if (!node.data) {
          return;
        }

        if (Node.isAction(node)) {
          const [parent] = Graph.getConnections(graph, node.id, Node.childRelation('inbound'));
          if (parent) {
            void runAction(node, { parent, path, caller: NAV_TREE_ITEM });
          }
          return;
        }

        const current = getItem(path).current;
        if (!current) {
          if (layout.mode === 'multi') {
            void invokePromise(LayoutOperation.Set, { subject: [node.id] });
          } else {
            void invokePromise(LayoutOperation.Open, { subject: [node.id], key: node.properties.key });
          }
        } else if (option) {
          void invokePromise(LayoutOperation.Close, { subject: [node.id] });
        } else {
          void invokePromise(LayoutOperation.ScrollIntoView, { subject: node.id });
        }

        const defaultAction = Graph.getActions(graph, node.id).find(
          (action) => action.properties?.disposition === 'default',
        );
        if (Node.isAction(defaultAction)) {
          void runAction(defaultAction);
        }

        if (!isLg) {
          void invokePromise(LayoutOperation.UpdateSidebar, { state: 'closed' });
        }
      },
      [graph, invokePromise, getItem, runAction, isLg, layout.mode],
    );

    const handleBack = useCallback(() => void invokePromise(LayoutOperation.RevertWorkspace), [invokePromise]);

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
            const sameParent = sourcePath.slice(0, -1).join() === targetPath.slice(0, -1).join();
            const operation =
              sameParent && instruction.type !== 'make-child'
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
                void sourceNode.properties.onRearrange?.(nextItems);
                break;
              }
              case 'copy': {
                const target = instruction.type === 'make-child' ? targetNode : targetParent;
                void target?.properties.onCopy?.(sourceNode, migrationIndex);
                break;
              }
              case 'transfer': {
                const target = instruction.type === 'make-child' ? targetNode : targetParent;
                if (!target?.properties.onTransferStart || target?.id === sourceParent?.id) {
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

    const onItemHover = useCallback(({ item }: { item: Node.Node }) => Graph.expand(graph, item.id, 'child'), [graph]);

    const navTreeContextValue = useMemo(
      () => ({
        model,
        popoverAnchorId,
        renderItemEnd: NavTreeItemEnd,
        blockInstruction,
        canDrop,
        canSelect,
        setAlternateTree,
        onBack: handleBack,
        onOpenChange: handleOpenChange,
        onSelect: handleSelect,
        onTabChange: handleTabChange,
        onItemHover,
      }),
      [
        model,
        popoverAnchorId,
        blockInstruction,
        canDrop,
        canSelect,
        setAlternateTree,
        handleBack,
        handleOpenChange,
        handleSelect,
        handleTabChange,
        onItemHover,
      ],
    );

    return (
      <NavTreeContext.Provider value={navTreeContextValue}>
        <NavTree id={Node.RootId} root={Graph.getRoot(graph)} tab={tab} open={layout.sidebarOpen} ref={forwardedRef} />
      </NavTreeContext.Provider>
    );
  },
);

export const NavTreeContainer = memo(NavTreeContainer$);
