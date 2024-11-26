//
// Copyright 2023 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractInstruction, type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { untracked } from '@preact/signals-core';
import React, { memo, useCallback, useEffect } from 'react';

import { NavigationAction, Surface, useIntentDispatcher } from '@dxos/app-framework';
import { isAction, isActionLike, type Node } from '@dxos/app-graph';
import { useGraph } from '@dxos/plugin-graph';
import { isEchoObject, isSpace } from '@dxos/react-client/echo';
import { ElevationProvider, useMediaQuery, useSidebars } from '@dxos/react-ui';
import { isTreeData, type TreeData, type PropsFromTreeItem } from '@dxos/react-ui-list';
import { mx } from '@dxos/react-ui-theme';
import { arrayMove } from '@dxos/util';

import { NAV_TREE_ITEM, NavTree, type NavTreeProps } from './NavTree';
import { NavTreeFooter } from './NavTreeFooter';
import { NAVTREE_PLUGIN } from '../meta';
import { type NavTreeItemGraphNode } from '../types';
import {
  expandActions,
  expandChildren,
  getActions as naturalGetActions,
  getChildren,
  getParent,
  resolveMigrationOperation,
} from '../util';

// TODO(thure): Is NavTree truly authoritative in this regard?
export const NODE_TYPE = 'dxos/app-graph/node';

const renderPresence = ({ node }: { node: Node }) => (
  <Surface role='presence--glyph' data={{ object: node.data, id: node.id }} />
);

export type NavTreeContainerProps = {
  popoverAnchorId?: string;
} & Pick<NavTreeProps, 'isOpen' | 'isCurrent' | 'onOpenChange'>;

export const NavTreeContainer = memo(({ popoverAnchorId, ...props }: NavTreeContainerProps) => {
  const { closeNavigationSidebar } = useSidebars(NAVTREE_PLUGIN);
  const [isLg] = useMediaQuery('lg', { ssr: false });
  const dispatch = useIntentDispatcher();
  const { graph } = useGraph();

  const getActions = useCallback((node: Node) => naturalGetActions(graph, node), [graph]);
  const getItems = useCallback(
    (node?: Node) => {
      return graph.nodes(node ?? graph.root, {
        filter: (node): node is Node => {
          return untracked(() => {
            const action = isActionLike(node);
            const disposition = node.properties.disposition;
            return !action || (action && disposition === 'item');
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
    ({ item: node }: { item: Node }) => {
      if (!node.data) {
        return;
      }

      if (isAction(node)) {
        const [parent] = graph.nodes(node, { relation: 'inbound' });
        void (parent && node.data({ node: parent, caller: NAV_TREE_ITEM }));
        return;
      }

      // TODO(thure): Refactor opening related planks (comments in this case) to a generalized approach.
      void dispatch({
        action: NavigationAction.OPEN,
        data: {
          activeParts: {
            main: [node.id],
          },
        },
      });

      const defaultAction = graph.actions(node).find((action) => action.properties?.disposition === 'default');
      if (isAction(defaultAction)) {
        void (defaultAction.data as () => void)();
      }

      if (!isLg) {
        closeNavigationSidebar();
      }
    },
    [graph, dispatch, isLg, closeNavigationSidebar],
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

  return (
    <ElevationProvider elevation='chrome'>
      <div
        role='none'
        className='grid grid-cols-1 grid-rows-[var(--rail-size)_1fr_min-content] bs-full overflow-hidden'
      >
        <div role='none' className='border-be border-separator'>
          <Surface role='search-input' limit={1} />
        </div>

        {/* TODO(thure): What gives this an inline `overflow: initial`? */}
        <div role='none' className='border-be border-separator !overflow-y-auto'>
          <NavTree
            id={graph.root.id}
            getActions={getActions}
            getItems={getItems}
            getProps={getProps}
            loadDescendents={loadDescendents}
            renderPresence={renderPresence}
            popoverAnchorId={popoverAnchorId}
            canDrop={canDrop}
            onSelect={handleSelect}
            {...props}
          />
        </div>

        <NavTreeFooter />
      </div>
    </ElevationProvider>
  );
});
