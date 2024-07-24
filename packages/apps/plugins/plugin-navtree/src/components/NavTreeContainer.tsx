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
import { getGraph } from '@dxos/app-graph';
import { ElevationProvider, Treegrid, useMediaQuery, useSidebars } from '@dxos/react-ui';
import { type MosaicDropEvent, type MosaicMoveEvent } from '@dxos/react-ui-mosaic';
import { NavTree, type NavTreeItemNode, type NavTreeNode } from '@dxos/react-ui-navtree';

import { NavTreeFooter } from './NavTreeFooter';
import { NAVTREE_PLUGIN } from '../meta';
import { type NavTreeItemGraphNode, treeItemsFromRootNode } from '../util';

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
    if (defaultAction && 'invoke' in defaultAction) {
      void defaultAction.invoke({});
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
    if (defaultAction && 'invoke' in defaultAction) {
      void defaultAction.invoke({});
    }
  };

  // const isOver: NavTreeProps['isOver'] = ({ path, operation, activeItem, overItem }) => {
  //   const activeNode = activeItem && getTreeNode(root, paths.get(Path.last(activeItem.path)));
  //   const overNode = overItem && getTreeNode(root, paths.get(Path.last(trimPlaceholder(overItem.path))));
  //   if (
  //     !activeNode ||
  //     !overNode ||
  //     !Path.hasRoot(overItem.path, root.id) ||
  //     (operation !== 'transfer' && operation !== 'copy')
  //   ) {
  //     return false;
  //   }
  //
  //   const activeClass = activeNode.properties.persistenceClass;
  //   if (overNode.properties.acceptPersistenceClass?.has(activeClass)) {
  //     return trimPlaceholder(overItem.path) === path;
  //   } else {
  //     const overAcceptParent = getPersistenceParent(overNode, activeClass);
  //     return overAcceptParent ? getMosaicPath(paths, overAcceptParent.id) === path : false;
  //   }
  // };

  const handleOver = useCallback(
    ({ active, over }: MosaicMoveEvent<number>) => {
      return 'reject';
      // // Reject all operations that don’t match the root's id
      // if (Path.first(active.path) !== root.id || Path.first(over.path) !== Path.first(active.path)) {
      //   return 'reject';
      // }
      // // Rearrange if rearrange is supported and active and over are siblings
      // else if (Path.siblings(over.path, active.path)) {
      //   return getTreeNode(root, paths.get(Path.last(Path.parent(over.path))))?.properties.onRearrangeChildren
      //     ? 'rearrange'
      //     : 'reject';
      // }
      // // Rearrange if rearrange is supported and active is or would be a child of over
      // else if (Path.hasChild(over.path, active.path)) {
      //   return getTreeNode(root, paths.get(Path.last(over.path)))?.properties.onRearrangeChildren
      //     ? 'rearrange'
      //     : 'reject';
      // }
      // // Check if transfer is supported
      // else {
      //   // Adjust overPath if over is empty placeholder.
      //   const overPath = trimPlaceholder(over.path);
      //   const overNode = getTreeNode(root, paths.get(Path.last(overPath)));
      //   const activeNode = getTreeNode(root, paths.get(Path.last(active.path)));
      //   const activeClass = activeNode?.properties.persistenceClass;
      //   const activeKey = activeNode?.properties.persistenceKey;
      //   if (overNode && activeNode && activeClass && activeKey) {
      //     const overAcceptParent = overNode.properties.acceptPersistenceClass?.has(activeClass)
      //       ? overNode
      //       : getPersistenceParent(overNode, activeClass);
      //     return overAcceptParent
      //       ? overAcceptParent.properties.acceptPersistenceKey?.has(activeKey)
      //         ? 'transfer'
      //         : 'copy'
      //       : 'reject';
      //   } else {
      //     return 'reject';
      //   }
      // }
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
          />
        </div>
        <NavTreeFooter layoutCoordinate={layoutCoordinate} />
      </div>
    </ElevationProvider>
  );
};
