//
// Copyright 2023 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractInstruction, type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import React, { useCallback, useEffect } from 'react';

import { NavigationAction, Surface, useIntentDispatcher } from '@dxos/app-framework';
import { isAction, isActionLike, type Node } from '@dxos/app-graph';
import { useGraph } from '@dxos/plugin-graph';
import { ElevationProvider, useMediaQuery, useSidebars } from '@dxos/react-ui';
import { isItem } from '@dxos/react-ui-list';
import { arrayMove } from '@dxos/util';

import { NAV_TREE_ITEM, NavTree, type NavTreeProps } from './NavTree';
import { NavTreeFooter } from './NavTreeFooter';
import { NAVTREE_PLUGIN } from '../meta';
import { type NavTreeItem } from '../types';
import {
  expandActions,
  expandChildren,
  getChildren,
  getParent,
  resolveMigrationOperation,
  type NavTreeItemGraphNode,
} from '../util';

// TODO(thure): Is NavTree truly authoritative in this regard?
export const NODE_TYPE = 'dxos/app-graph/node';

const renderPresence = ({ item }: { item: NavTreeItem }) => (
  <Surface role='presence--glyph' data={{ object: item.node.data, id: item.node.id }} />
);

export const NavTreeContainer = ({
  items,
  current,
  open,
  onOpenChange,
  popoverAnchorId,
}: {
  items: NavTreeItem[];
  current: string[];
  open: string[];
  onOpenChange: NavTreeProps['onOpenChange'];
  popoverAnchorId?: string;
}) => {
  const { closeNavigationSidebar } = useSidebars(NAVTREE_PLUGIN);
  const [isLg] = useMediaQuery('lg', { ssr: false });
  const dispatch = useIntentDispatcher();

  const { graph } = useGraph();

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

  const handleSelect = useCallback(
    ({ node, actions, path }: NavTreeItem) => {
      if (!node.data) {
        return;
      }

      if (isAction(node)) {
        const [parentId] = path.slice(1);
        const parent = items.find(({ id }) => id === parentId)?.node;
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

      const defaultAction = actions?.find((action) => action.properties?.disposition === 'default');
      if (isAction(defaultAction)) {
        void (defaultAction.data as () => void)();
      }
      if (!isLg) {
        closeNavigationSidebar();
      }
    },
    [dispatch, isLg, closeNavigationSidebar],
  );

  // TODO(wittjosiah): Factor out hook.
  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => isItem(source.data),
      onDrop: ({ location, source }) => {
        // Didn't drop on anything.
        if (!location.current.dropTargets.length) {
          return;
        }

        const target = location.current.dropTargets[0];

        const instruction: Instruction | null = extractInstruction(target.data);
        if (instruction !== null && instruction.type !== 'instruction-blocked') {
          const sourceNode = source.data.node as NavTreeItemGraphNode;
          const targetNode = target.data.node as NavTreeItemGraphNode;

          const sourcePath = source.data.path as string[];
          const targetPath = target.data.path as string[];

          const nextItems = instruction.type.startsWith('reorder')
            ? items.filter((item) => item.path.slice(0, -1).join() === targetPath.slice(0, -1).join())
            : items.filter((item) => item.path.slice(0, -1).join() === targetPath.join());
          const operation =
            sourcePath.slice(0, -1).join() === targetPath.slice(0, -1).join()
              ? 'rearrange'
              : resolveMigrationOperation(graph, sourceNode, targetPath, targetNode);

          const sourceParent = getParent(graph, sourceNode, sourcePath);
          const targetParent = getParent(graph, targetNode, targetPath);

          const sourceIndex = nextItems.findIndex(({ id }) => id === sourceNode.id);
          const targetIndex = nextItems.findIndex(({ id }) => id === targetNode.id);
          const migrationIndex =
            instruction.type === 'make-child'
              ? nextItems.length - 1
              : instruction.type === 'reorder-below'
                ? targetIndex + 1
                : targetIndex;

          switch (operation) {
            case 'rearrange': {
              arrayMove(nextItems, sourceIndex, targetIndex);
              void sourceParent?.properties.onRearrangeChildren?.(nextItems.map((item) => item.node.data));
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
  }, [items]);

  return (
    <ElevationProvider elevation='chrome'>
      <div
        role='none'
        className='bs-full overflow-hidden row-span-3 grid grid-cols-1 grid-rows-[min-content_1fr_min-content]'
      >
        <Surface role='search-input' limit={1} />

        {/* TODO(thure): What gives this an inline `overflow: initial`? */}
        <div role='none' className='!overflow-y-auto'>
          <NavTree
            items={items}
            open={open}
            current={current}
            loadDescendents={loadDescendents}
            renderPresence={renderPresence}
            popoverAnchorId={popoverAnchorId}
            onOpenChange={onOpenChange}
            onSelect={handleSelect}
          />
        </div>

        <NavTreeFooter />
      </div>
    </ElevationProvider>
  );
};
