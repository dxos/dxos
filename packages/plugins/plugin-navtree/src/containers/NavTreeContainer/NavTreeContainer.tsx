//
// Copyright 2023 DXOS.org
//

import { type Instruction, extractInstruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import React, { forwardRef, memo, useCallback, useEffect, useMemo, useRef } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AppSurface, useAppGraph, useLayout } from '@dxos/app-toolkit/ui';
import * as GraphNode from '@dxos/graph/GraphNode';
import { useActionRunner } from '@dxos/plugin-graph/hooks';
import { useMediaQuery, useSidebars } from '@dxos/react-ui';
import { type TreeData, isTreeDataFor } from '@dxos/react-ui-list';
import { arrayMove } from '@dxos/util';

import { NAV_TREE_ITEM, NavTree, NavTreeContext } from '#components';
import { useNavTreeModel, useNavTreeState } from '#hooks';
import { meta } from '#meta';
import { NavTreeNode } from '#types';

import { filterItems, getParent, resolveMigrationOperation } from '../../util.ts';

// TODO(thure): Is NavTree truly authoritative in this regard?
export const NODE_TYPE = 'dxos/app-graph/node';

/** How long the cursor must rest on a row before it is prefetched; long enough that merely crossing it does not. */
const HOVER_SETTLE_DELAY = Duration.millis(150);

// TODO(wittjosiah): Avoid using Surface within the navtree, prefer declarative data flow.
const NavTreeItemEnd = ({ node, open }: { node: AppGraphNode.Node; open: boolean }) => {
  const data = useMemo(() => ({ id: node.id, subject: node.data, open }), [node.id, node.data, open]);
  return <Surface.Surface type={AppSurface.NavtreeItemEnd} data={data} limit={1} />;
};

const getItems = (graph: AppGraph.ReadableGraph, node?: AppGraphNode.Node, disposition?: string) => {
  return AppGraph.getConnections(graph, node?.id ?? GraphNode.RootId, 'child').filter((node) =>
    filterItems(node, disposition),
  );
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
    const model = useNavTreeModel(GraphNode.RootId);
    const { navigationSidebarState } = useSidebars(meta.profile.key);
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
      ({ item: { id }, path, open }: { item: AppGraphNode.Node; path: string[]; open: boolean }) => {
        // TODO(thure): This might become a localstorage leak; openItemIds that no longer exist should be removed from this map.
        setItem(path, 'open', open);
        AppGraph.expandSync(graph, id, 'child');
      },
      [graph, setItem],
    );

    const handleTabChange = useCallback(
      (node: NavTreeNode.NavTreeItemGraphNode) => {
        AppGraph.expandSync(graph, node.id, 'child');

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
          const [item] = getItems(graph, node).filter((node) => !AppGraphNode.isActionLike(node));
          if (item && item.data) {
            void invokePromise(LayoutOperation.Open, { subject: [item.id] });
          }
        }
      },
      [invokePromise, graph],
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

    const canSelect = useCallback(({ item }: { item: AppGraphNode.Node }) => {
      return item.properties.selectable ?? true;
    }, []);

    const handleSelect = useCallback(
      ({
        item: node,
        path,
        option,
        shift,
      }: {
        item: AppGraphNode.Node;
        path: string[];
        option: boolean;
        shift: boolean;
      }) => {
        if (!node.data) {
          return;
        }

        if (AppGraphNode.isAction(node)) {
          const [parent] = AppGraph.getConnections(graph, node.id, AppGraphNode.childRelation('inbound'));
          if (parent) {
            void runAction(node, { parent, path, caller: NAV_TREE_ITEM });
          }
          return;
        }

        const current = getItem(path).current;
        if (!current) {
          // Plain click navigates (the deck becomes this item); shift forces a new plank (see the Open
          // handler, which upgrades any disposition to add when shift is held).
          void invokePromise(LayoutOperation.Open, {
            subject: [node.id],
            disposition: 'solo',
            modifiers: { shift },
          });
        } else if (option) {
          void invokePromise(LayoutOperation.Close, { subject: [node.id] });
        } else {
          void invokePromise(LayoutOperation.ScrollIntoView, { subject: node.id });
        }

        const defaultAction = AppGraph.getActions(graph, node.id).find((action) =>
          AppGraphNode.hasDisposition(action, 'default'),
        );
        if (AppGraphNode.isAction(defaultAction)) {
          void runAction(defaultAction);
        }

        if (!isLg) {
          void invokePromise(LayoutOperation.UpdateSidebar, { state: 'closed' });
        }
      },
      [graph, invokePromise, getItem, runAction, isLg],
    );

    const handleBack = useCallback(() => void invokePromise(LayoutOperation.RevertWorkspace), [invokePromise]);

    // TODO(wittjosiah): Factor out hook.
    useEffect(() => {
      return monitorForElements({
        // Scoped to this tree: monitors are global and every tree's payload has the same shape, so
        // without the id this claimed a task list's drag and then read its item as a graph node.
        canMonitor: ({ source }) => isTreeDataFor(source.data, GraphNode.RootId),
        onDrop: ({ location, source }) => {
          // Didn't drop on anything.
          if (!location.current.dropTargets.length) {
            return;
          }
          const target = location.current.dropTargets[0];
          const instruction: Instruction | null = extractInstruction(target.data);
          if (instruction !== null && instruction.type !== 'instruction-blocked') {
            const sourceNode = source.data.item as NavTreeNode.NavTreeItemGraphNode;
            const targetNode = target.data.item as NavTreeNode.NavTreeItemGraphNode;
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

    // Group nodes are always expanded and have no toggle, so they never trigger AppGraph.expand through
    // user interaction. Watch the workspace's children reactively and mark any group nodes as open
    // so the state machinery treats them consistently with regular open nodes (including on next load).
    const workspaceChildren = useAtomValue(graph.connections(tab, 'child'));
    useEffect(() => {
      for (const child of workspaceChildren) {
        if (AppGraphNode.hasDisposition(child, 'group')) {
          setItem([GraphNode.RootId, tab, child.id], 'open', true);
          AppGraph.expandSync(graph, child.id, 'child');
        }
      }
    }, [workspaceChildren, tab, setItem, graph]);

    // Prefetching a hovered row is speculative, so it waits out the cursor rather than racing it: a sweep
    // should only pay for the row the cursor stops on.
    const hoverExpandRef = useRef<Fiber.Fiber<void> | undefined>(undefined);
    const interruptHoverExpand = useCallback(() => {
      if (hoverExpandRef.current) {
        void Effect.runFork(Fiber.interrupt(hoverExpandRef.current));
        hoverExpandRef.current = undefined;
      }
    }, []);
    useEffect(() => interruptHoverExpand, [interruptHoverExpand]);
    const onItemHover = useCallback(
      ({ item }: { item: AppGraphNode.Node }) => {
        interruptHoverExpand();
        hoverExpandRef.current = Effect.runFork(
          Effect.sleep(HOVER_SETTLE_DELAY).pipe(Effect.andThen(AppGraph.expand(graph, item.id, 'child'))),
        );
      },
      [graph, interruptHoverExpand],
    );

    const navTreeContextValue = useMemo(
      () => ({
        model,
        popoverAnchorId,
        renderItemEnd: NavTreeItemEnd,
        blockInstruction,
        canDrop,
        canSelect,
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
        handleBack,
        handleOpenChange,
        handleSelect,
        handleTabChange,
        onItemHover,
      ],
    );

    return (
      <NavTreeContext.Provider value={navTreeContextValue}>
        <NavTree
          id={GraphNode.RootId}
          root={AppGraph.getRoot(graph)}
          tab={tab}
          open={layout.sidebarOpen}
          ref={forwardedRef}
        />
      </NavTreeContext.Provider>
    );
  },
);

export const NavTreeContainer = memo(NavTreeContainer$);

NavTreeContainer.displayName = 'NavTreeContainer';
