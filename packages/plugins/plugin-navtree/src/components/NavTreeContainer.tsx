//
// Copyright 2023 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractInstruction, type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { untracked } from '@preact/signals-core';
import React, { memo, useCallback, useEffect, useMemo } from 'react';

import {
  createIntent,
  LayoutAction,
  Surface,
  useAppGraph,
  useCapability,
  useIntentDispatcher,
  useLayout,
} from '@dxos/app-framework';
import { isAction, isActionLike, type Node } from '@dxos/app-graph';
import { isEchoObject, isSpace } from '@dxos/react-client/echo';
import { useMediaQuery } from '@dxos/react-ui';
import { isTreeData, type TreeData, type PropsFromTreeItem } from '@dxos/react-ui-list';
import { mx } from '@dxos/react-ui-theme';
import { arrayMove } from '@dxos/util';

import { NAV_TREE_ITEM, NavTree } from './NavTree';
import { NavTreeContext } from './NavTreeContext';
import { type NavTreeContextValue } from './types';
import { NavTreeCapabilities } from '../capabilities';
import { type NavTreeItemGraphNode } from '../types';
import {
  expandActions,
  expandChildren,
  getActions as naturalGetActions,
  getChildren,
  getParent,
  resolveMigrationOperation,
  expandChildrenAndActions,
} from '../util';

// TODO(thure): Is NavTree truly authoritative in this regard?
export const NODE_TYPE = 'dxos/app-graph/node';

const renderItemEnd = ({ node, open }: { node: Node; open: boolean }) => (
  <Surface role='navtree-item-end' data={{ id: node.id, subject: node.data, open }} limit={1} />
);

export type NavTreeContainerProps = {
  popoverAnchorId?: string;
  topbar?: boolean;
} & Pick<NavTreeContextValue, 'tab'>;

export const NavTreeContainer = memo(({ tab, popoverAnchorId, topbar }: NavTreeContainerProps) => {
  const [isLg] = useMediaQuery('lg', { ssr: false });
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const { graph } = useAppGraph();
  const layout = useLayout();
  const { isOpen, isCurrent, setItem } = useCapability(NavTreeCapabilities.State);

  const getActions = useCallback((node: Node) => naturalGetActions(graph, node), [graph]);

  const getItems = useCallback(
    (node?: Node, disposition?: string) => {
      return graph.nodes(node ?? graph.root, {
        filter: (node): node is Node => {
          return untracked(() => {
            const action = isAction(node);
            if (!disposition) {
              return !action || node.properties.disposition === 'item';
            }

            return node.properties.disposition === disposition;
          });
        },
      });
    },
    [graph],
  );

  const getProps = useCallback(
    (node: Node, path: string[]): PropsFromTreeItem => {
      const children = getChildren(graph, node, undefined, path);
      const parentOf =
        children.length > 0 ? children.map(({ id }) => id) : node.properties.role === 'branch' ? [] : undefined;
      return {
        id: node.id,
        label: node.properties.label ?? node.id,
        parentOf,
        icon: node.properties.icon,
        disabled: node.properties.disabled,
        className: mx(node.properties.modified && 'italic', node.properties.className),
        headingClassName: node.properties.headingClassName,
        testId: node.properties.testId,
      };
    },
    [graph],
  );

  const loadDescendents = useCallback(
    (node: Node) => {
      void expandActions(graph, node);
      if (!isActionLike(node)) {
        void expandChildren(graph, node).then(() =>
          // Load one level deeper, which resolves some juddering observed on open/close.
          Promise.all(
            getChildren(graph, node).flatMap((child) => [expandActions(graph, child), expandChildren(graph, child)]),
          ),
        );
      }
    },
    [graph],
  );

  const onOpenChange = useCallback(
    ({ item: { id }, path, open }: { item: Node; path: string[]; open: boolean }) => {
      // TODO(thure): This might become a localstorage leak; openItemIds that no longer exist should be removed from this map.
      setItem(path, 'open', open);

      if (graph) {
        const node = graph.findNode(id);
        return node && expandChildrenAndActions(graph, node as NavTreeItemGraphNode);
      }
    },
    [graph],
  );

  const onTabChange = useCallback(
    async (node: NavTreeItemGraphNode) => {
      await dispatch(createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: node.id }));
      // Open the first item if the workspace is empty.
      if (layout.active.length === 0) {
        const [item] = getItems(node).filter((node) => !isActionLike(node));
        if (item && item.data) {
          await dispatch(createIntent(LayoutAction.Open, { part: 'main', subject: [item.id] }));
        }
      }
    },
    [dispatch, layout],
  );

  const canDrop = useCallback((source: TreeData, target: TreeData) => {
    const sourceNode = source.item as Node;
    const targetNode = target.item as Node;
    if (isSpace(targetNode.data)) {
      // TODO(wittjosiah): Find a way to only allow space as source for rearranging.
      return isEchoObject(sourceNode.data) || isSpace(sourceNode.data);
    } else if (isEchoObject(targetNode.data)) {
      return isEchoObject(sourceNode.data);
    } else {
      return false;
    }
  }, []);

  const handleSelect = useCallback(
    ({ item: node, path, option }: { item: Node; path: string[]; option: boolean }) => {
      if (!node.data) {
        return;
      }

      if (isAction(node)) {
        const [parent] = graph.nodes(node, { relation: 'inbound' });
        void (parent && node.data({ node: parent, caller: NAV_TREE_ITEM }));
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

      const defaultAction = graph.actions(node).find((action) => action.properties?.disposition === 'default');
      if (isAction(defaultAction)) {
        void (defaultAction.data as () => void)();
      }

      if (!isLg) {
        void dispatch(createIntent(LayoutAction.UpdateSidebar, { part: 'sidebar', options: { state: 'closed' } }));
      }
    },
    [graph, dispatch, isCurrent, isLg],
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
          const sourceItems = getItems(sourceParent);
          const targetItems = getItems(targetParent);
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

  const navTreeContextValue = useMemo(
    () => ({
      tab,
      onTabChange,
      getActions,
      loadDescendents,
      renderItemEnd,
      popoverAnchorId,
      topbar,
      getItems,
      getProps,
      isCurrent,
      isOpen,
      onOpenChange,
      canDrop,
      onSelect: handleSelect,
    }),
    [
      tab,
      onTabChange,
      getActions,
      loadDescendents,
      renderItemEnd,
      popoverAnchorId,
      topbar,
      getItems,
      getProps,
      isCurrent,
      isOpen,
      onOpenChange,
      canDrop,
      handleSelect,
    ],
  );

  return (
    <NavTreeContext.Provider value={navTreeContextValue}>
      <NavTree root={graph.root} id={graph.root.id} />
    </NavTreeContext.Provider>
  );
});
