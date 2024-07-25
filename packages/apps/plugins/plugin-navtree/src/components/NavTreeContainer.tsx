//
// Copyright 2023 DXOS.org
//

import React, { type ReactNode, useCallback, useMemo } from 'react';

import {
  NavigationAction,
  LayoutAction,
  Surface,
  useIntent,
  type LayoutCoordinate,
  useResolvePlugin,
  parseNavigationPlugin,
  SLUG_PATH_SEPARATOR,
  SLUG_COLLECTION_INDICATOR,
} from '@dxos/app-framework';
import { getGraph, isAction } from '@dxos/app-graph';
import { ElevationProvider, Treegrid, useMediaQuery, useSidebars } from '@dxos/react-ui';
import { type MosaicDropEvent, type MosaicMoveEvent, Path } from '@dxos/react-ui-mosaic';
import { NavTree, type NavTreeItemNode, type NavTreeNode, getLevel } from '@dxos/react-ui-navtree';
import { arrayMove } from '@dxos/util';

import { NavTreeFooter } from './NavTreeFooter';
import { NAVTREE_PLUGIN } from '../meta';
import { getParent, type NavTreeItem, type NavTreeItemGraphNode, treeItemsFromRootNode } from '../util';

export const NODE_TYPE = 'dxos/app-graph/node';

const renderPresence = (node: NavTreeNode): ReactNode => (
  <Surface role='presence--glyph' data={{ object: node.data }} />
);

export const NavTreeContainer = ({
  root,
  activeIds,
  openItemPaths,
  onOpenItemPathsChange,
  attended,
  popoverAnchorId,
  layoutCoordinate,
}: {
  root: NavTreeItemGraphNode;
  activeIds: Set<string>;
  openItemPaths: Set<string>;
  onOpenItemPathsChange: (nextOpenItemPaths: Set<string>) => void;
  attended: Set<string>;
  popoverAnchorId?: string;
  layoutCoordinate?: LayoutCoordinate;
}) => {
  const { closeNavigationSidebar } = useSidebars(NAVTREE_PLUGIN);
  const [isLg] = useMediaQuery('lg', { ssr: false });
  const { dispatch } = useIntent();

  const navPlugin = useResolvePlugin(parseNavigationPlugin);
  const isDeckModel = navPlugin?.meta.id === 'dxos.org/plugin/deck';

  const graph = useMemo(() => getGraph(root), [root]);

  const items = treeItemsFromRootNode(graph, root, openItemPaths);

  const handleNavigate = async ({ node, actions }: NavTreeItemNode) => {
    if (!node.data) {
      return;
    }

    await dispatch({
      action: NavigationAction.OPEN,
      data: {
        // TODO(thure): don’t bake this in, refactor this to be a generalized approach.
        activeParts:
          isDeckModel && !!node.data?.comments
            ? {
                main: [node.id],
                complementary: `${node.id}${SLUG_PATH_SEPARATOR}comments${SLUG_COLLECTION_INDICATOR}`,
              }
            : {
                main: [node.id],
              },
      },
    });

    await dispatch({ action: LayoutAction.SCROLL_INTO_VIEW, data: { id: node.id } });

    const defaultAction = actions?.find((action) => action.properties?.disposition === 'default');
    if (isAction(defaultAction)) {
      void (defaultAction.data as () => void)();
    }
    !isLg && closeNavigationSidebar();
  };

  const handleItemOpenChange = ({ actions, path }: NavTreeItemNode, nextOpen: boolean) => {
    if (path) {
      openItemPaths[nextOpen ? 'add' : 'delete'](path.join(Treegrid.PATH_SEPARATOR));
      onOpenItemPathsChange(new Set(Array.from(openItemPaths)));
    }
    // TODO(wittjosiah): This is a temporary solution to ensure spaces get enabled when they are expanded.
    const defaultAction = actions?.find((action) => action.properties?.disposition === 'default');
    if (isAction(defaultAction)) {
      void (defaultAction.data as () => void)();
    }
  };

  const resolveItemLevel = useCallback(
    (overPosition: number | undefined, activeId: string | undefined, levelOffset: number) => {
      if (!(typeof overPosition === 'number' && activeId)) {
        return 1;
      } else {
        const nextItems = arrayMove(
          items,
          items.findIndex(({ id }) => id === activeId),
          overPosition,
        );
        const previousItem: NavTreeItem | undefined = nextItems[overPosition - 1];
        const nextItem: NavTreeItem | undefined = nextItems[overPosition + 1];
        return Math.min(
          previousItem ? getLevel(previousItem?.path) + 1 : 1,
          Math.max(nextItem ? getLevel(nextItem?.path) : 1, getLevel(nextItems[overPosition].path) + levelOffset),
        );
      }
    },
    [items],
  );

  const handleOver = useCallback(
    ({ active, over, details = {} }: MosaicMoveEvent<number, { levelOffset?: number }>) => {
      const { levelOffset = 0 } = details;
      const overPosition = over.position ?? 0;

      const nextItems = arrayMove(
        items,
        items.findIndex(({ id }) => id === active.item.id),
        overPosition,
      );

      const previousItem: NavTreeItem | undefined = nextItems[overPosition - 1];
      const nextItem: NavTreeItem | undefined = nextItems[overPosition + 1];

      if (!previousItem || !previousItem.path) {
        // log.warn('Top-level rearrange before the first item of the NavTree is unsupported at this time.');
        return 'reject';
      }

      const overLevel = resolveItemLevel(overPosition, active.item.id, levelOffset);

      const previousLevel = getLevel(previousItem.path);
      const previousPath = Path.create(...previousItem.path);

      if (previousLevel === overLevel - 1) {
        if (Path.hasChild(previousPath, active.path)) {
          // Previous is already parent of Active, rearrange.
          return previousItem.node.properties.onRearrangeChildren ? 'rearrange' : 'reject';
        } else {
          // Previous is not yet parent of Active, transfer.
          return previousItem.node.properties.onTransferStart ? 'transfer' : 'reject';
        }
      } else if (previousLevel === overLevel) {
        const parent = getParent(graph, previousItem.node, previousItem.path);
        if (Path.siblings(previousPath, active.path)) {
          // Previous is already a sibling of Active, rearrange.
          return parent?.properties.onRearrangeChildren ? 'rearrange' : 'reject';
        } else {
          // Previous is not yet a sibling of Active, transfer to Previous’s parent.
          return parent?.properties.onTransferStart ? 'transfer' : 'reject';
        }
      } else if (nextItem && nextItem.path) {
        const nextLevel = getLevel(nextItem.path);
        const nextPath = Path.create(...nextItem.path);
        if (nextLevel === overLevel) {
          const parent = getParent(graph, nextItem.node, nextItem.path);
          if (Path.siblings(nextPath, active.path)) {
            // Next is already a sibling of Active, rearrange.
            return parent?.properties.onRearrangeChildren ? 'rearrange' : 'reject';
          } else {
            // Next is not yet a sibling of Active, transfer to Next’s parent.
            return parent?.properties.onTransferStart ? 'transfer' : 'reject';
          }
        } else {
          return 'reject';
        }
      } else {
        return 'reject';
      }
    },
    [root],
  );

  const handleDrop = useCallback(
    ({ operation, active, over }: MosaicDropEvent<number>) => {
      // const overPath = trimPlaceholder(over.path);
      // const activeNode = getTreeNode(root, paths.get(Path.last(active.path)));
      // const overNode = getTreeNode(root, paths.get(Path.last(overPath)));
      // // TODO(wittjosiah): Support dragging things into the tree.
      // if (activeNode && overNode && overPath.startsWith(root.id)) {
      //   const activeClass = activeNode.properties.persistenceClass;
      //   const activeParent = activeNode.parent;
      //   if (activeParent && operation === 'rearrange') {
      //     const ids = activeParent.children.map((node) => node.id);
      //     const nodes = activeParent.children.map(({ data }) => data);
      //     const activeIndex = ids.indexOf(activeNode.id);
      //     const overIndex = ids.indexOf(overNode.id);
      //     activeParent.properties.onRearrangeChildren(
      //       arrayMove(nodes, activeIndex, overIndex > -1 ? overIndex : ids.length - 1),
      //     );
      //   }
      //   if (operation === 'transfer') {
      //     const destinationParent = overNode?.properties.acceptPersistenceClass?.has(activeClass)
      //       ? overNode
      //       : getPersistenceParent(overNode, activeClass);
      //     const originParent = getPersistenceParent(activeNode, activeClass);
      //     if (destinationParent && originParent) {
      //       destinationParent.properties.onTransferStart(activeNode);
      //       originParent.properties.onTransferEnd(activeNode, destinationParent);
      //     }
      //   }
      //   if (operation === 'copy') {
      //     const destinationParent = overNode?.properties.acceptPersistenceClass?.has(activeClass)
      //       ? overNode
      //       : getPersistenceParent(overNode, activeClass);
      //     if (destinationParent) {
      //       void destinationParent.properties.onCopy(activeNode);
      //     }
      //   }
      // }
    },
    [root],
  );

  return (
    <ElevationProvider elevation='chrome'>
      <div
        role='none'
        className='bs-full overflow-hidden row-span-3 grid grid-cols-1 grid-rows-[min-content_1fr_min-content]'
      >
        <Surface role='search-input' limit={1} />
        <div role='none' className='!overflow-y-auto p-0.5'>
          <NavTree
            id={root.id}
            items={items}
            current={activeIds}
            attended={attended}
            type={NODE_TYPE}
            onNavigate={handleNavigate}
            onItemOpenChange={handleItemOpenChange}
            onOver={handleOver}
            onDrop={handleDrop}
            popoverAnchorId={popoverAnchorId}
            renderPresence={renderPresence}
            resolveItemLevel={resolveItemLevel}
          />
        </div>
        <NavTreeFooter layoutCoordinate={layoutCoordinate} />
      </div>
    </ElevationProvider>
  );
};
