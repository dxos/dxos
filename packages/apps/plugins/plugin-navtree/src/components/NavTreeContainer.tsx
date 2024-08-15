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
import { getGraph, isAction, isActionLike } from '@dxos/app-graph';
import { ElevationProvider, useMediaQuery, useSidebars } from '@dxos/react-ui';
import { type MosaicDropEvent, type MosaicMoveEvent, Path } from '@dxos/react-ui-mosaic';
import {
  NavTree,
  type NavTreeItemNode,
  type NavTreeNode,
  getLevel,
  type NavTreeActionsNode,
  type NavTreeProps,
  type NavTreeItemMoveDetails,
} from '@dxos/react-ui-navtree';
import { arrayMove } from '@dxos/util';

import { NavTreeFooter } from './NavTreeFooter';
import { NAVTREE_PLUGIN } from '../meta';
import {
  expandActions,
  expandChildren,
  getChildren,
  getParent,
  type NavTreeItem,
  type NavTreeItemGraphNode,
  resolveMigrationOperation,
  treeItemsFromRootNode,
} from '../util';

// TODO(thure): Is NavTree truly authoritative in this regard?
export const NODE_TYPE = 'dxos/app-graph/node';

const renderPresence = (node: NavTreeNode): ReactNode => (
  <Surface role='presence--glyph' data={{ object: node.data }} />
);

export const NavTreeContainer = ({
  root,
  activeIds,
  openItemIds,
  onOpenItemIdsChange,
  attended,
  popoverAnchorId,
  layoutCoordinate,
}: {
  root: NavTreeItemGraphNode;
  activeIds: Set<string>;
  openItemIds: Record<string, true>;
  onOpenItemIdsChange: (nextOpenItemIds: Record<string, true>) => void;
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

  const items = treeItemsFromRootNode(graph, root, openItemIds);

  const loadDescendents = useCallback(
    (node: NavTreeNode | NavTreeActionsNode) => {
      void expandActions(graph, node as NavTreeItemGraphNode);
      if (!isActionLike(node)) {
        void expandChildren(graph, node as NavTreeItemGraphNode).then(() =>
          // Load one level deeper, which resolves some juddering observed on open/close.
          Promise.all(
            getChildren(graph, node as NavTreeItemGraphNode).flatMap((child) => [
              expandActions(graph, child),
              expandChildren(graph, child),
            ]),
          ),
        );
      }
    },
    [graph],
  );

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

  const handleItemOpenChange = ({ id, actions, path }: NavTreeItemNode, nextOpen: boolean) => {
    if (path) {
      if (nextOpen) {
        onOpenItemIdsChange({ ...openItemIds, [id]: true });
      } else {
        // TODO(thure): Filter vs single-remove, make setting?
        const { [id]: _, ...nextOpenItemIds } = openItemIds;
        onOpenItemIdsChange(nextOpenItemIds);
      }
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

  const handleMove: NavTreeProps['onMove'] = useCallback(
    ({ active, over, details }: MosaicMoveEvent<number, NavTreeItemMoveDetails>) => {
      const levelOffset = Math.floor((details?.delta?.x ?? 0) / 16);
      const overPosition = over.position ?? 0;

      const nextItems = arrayMove(
        items,
        items.findIndex(({ id }) => id === active.item.id),
        overPosition,
      );

      const previousItem: NavTreeItem | undefined = nextItems[overPosition - 1];
      const nextItem: NavTreeItem | undefined = nextItems[overPosition + 1];

      const activeNode = 'node' in active.item ? (active.item as NavTreeItem).node : undefined;

      if (!activeNode || !previousItem || !previousItem.path) {
        // console.log('[reject]', !activeNode, !previousItem, !previousItem.path);
        // log.warn('Top-level rearrange before the first item of the NavTree is unsupported at this time.');
        return { operation: 'reject' as const, details: { levelOffset } };
      }

      const overLevel = resolveItemLevel(overPosition, active.item.id, levelOffset);

      const previousLevel = getLevel(previousItem.path);

      // console.log('[over]', overLevel, previousLevel, levelOffset);

      if (previousLevel === overLevel - 1) {
        if (Path.hasChild(previousItem.id, active.item.id)) {
          // Previous is already parent of Active, rearrange.
          const operation = previousItem.node.properties.onRearrangeChildren
            ? ('rearrange' as const)
            : ('reject' as const);
          return { operation, details: { levelOffset } };
        } else {
          // Previous is not yet parent of Active, check transfer or copy.
          const operation = resolveMigrationOperation(graph, activeNode, previousItem.path, previousItem.node);
          // console.log('[migration result]', operation, 'Previous is not yet parent of Active, check transfer or copy.');
          return { operation, details: { levelOffset } };
        }
      } else if (previousLevel === overLevel) {
        const parent = getParent(graph, previousItem.node, previousItem.path);
        const parentPath = previousItem.path.slice(0, previousItem.path.length - 1);
        if (Path.siblings(previousItem.id, active.item.id)) {
          // Previous is already a sibling of Active, rearrange.
          const operation = parent?.properties.onRearrangeChildren ? ('rearrange' as const) : ('reject' as const);
          return { operation, details: { levelOffset } };
        } else {
          // Previous is not yet a sibling of Active, transfer/copy to Previous’s parent.
          const operation = resolveMigrationOperation(graph, activeNode, parentPath, parent);
          // console.log(
          //   '[migration result]',
          //   operation,
          //   'Previous is not yet a sibling of Active, transfer/copy to Previous’s parent.',
          // );
          return { operation, details: { levelOffset } };
        }
      } else if (nextItem && nextItem.path) {
        const nextLevel = getLevel(nextItem.path);
        if (nextLevel === overLevel) {
          const parent = getParent(graph, nextItem.node, nextItem.path);
          const parentPath = nextItem.path.slice(0, nextItem.path.length - 1);
          if (Path.siblings(nextItem.id, active.item.id)) {
            // Next is already a sibling of Active, rearrange.
            const operation = parent?.properties.onRearrangeChildren ? ('rearrange' as const) : ('reject' as const);
            return { operation, details: { levelOffset } };
          } else {
            // Next is not yet a sibling of Active, transfer to Next’s parent.
            const operation = resolveMigrationOperation(graph, activeNode, parentPath, parent);
            // console.log(
            //   '[migration result]',
            //   operation,
            //   'Next is not yet a sibling of Active, transfer to Next’s parent.',
            // );
            return { operation, details: { levelOffset } };
          }
        } else {
          // console.log('[migration result]', 'reject');
          return { operation: 'reject' as const, details: { levelOffset } };
        }
      } else {
        // console.log('[migration result]', 'reject');
        return { operation: 'reject' as const, details: { levelOffset } };
      }
    },
    [root, items],
  );

  const handleDrop = useCallback(
    ({ operation, active, over, details = {} }: MosaicDropEvent<number, NavTreeItemMoveDetails>) => {
      if (Path.first(over.path) !== root.id) {
        return undefined;
      }
      const { levelOffset = 0 } = details;
      const overPosition = over.position ?? 0;

      const nextItems = arrayMove(
        items,
        items.findIndex(({ id }) => id === active.item.id),
        overPosition,
      );

      const activeNode = 'node' in active.item ? (active.item as NavTreeItem).node : undefined;
      const activeParentId = Path.parent(active.item.id);

      if (!activeNode) {
        return undefined;
      }

      const activeParent = getParent(graph, activeNode, (active.item as NavTreeItem).path ?? []);

      if (operation === 'rearrange') {
        void activeParent?.properties.onRearrangeChildren?.(
          nextItems.filter(({ id }) => Path.hasChild(activeParentId, id)).map(({ node }) => node.data),
        );
        return null;
      } else {
        const previousItem: NavTreeItem | undefined = nextItems[overPosition - 1];
        const nextItem: NavTreeItem | undefined = nextItems[overPosition + 1];

        const overLevel = resolveItemLevel(overPosition, active.item.id, levelOffset);

        const previousLevel = getLevel(previousItem.path);

        if (operation === 'copy') {
          if (previousLevel === overLevel - 1) {
            void previousItem.node.properties.onCopy?.(activeNode, 0);
            return null;
          } else if (previousLevel === overLevel) {
            const parent = getParent(graph, previousItem.node, previousItem.path ?? []);
            void parent?.properties.onCopy?.(
              activeNode,
              getChildren(graph, parent).findIndex(({ id }) => id === previousItem.node.id) + 1,
            );
            return null;
          } else if (nextItem && nextItem.path) {
            const parent = getParent(graph, nextItem.node, nextItem.path ?? []);
            void parent?.properties.onCopy?.(
              activeNode,
              getChildren(graph, parent).findIndex(({ id }) => id === nextItem.node.id),
            );
            return null;
          }
        } else if (operation === 'transfer') {
          const onTransferEnd = activeParent?.properties.onTransferEnd;
          if (!onTransferEnd) {
            return undefined;
          } else if (previousLevel === overLevel - 1) {
            const onTransferStart = previousItem.node.properties.onTransferStart;
            if (onTransferStart) {
              void onTransferEnd(activeNode, previousItem.node);
              void onTransferStart(activeNode, 0);
              return null;
            }
          } else if (previousLevel === overLevel && previousItem.path) {
            const parent = getParent(graph, previousItem.node, previousItem.path);
            if (parent?.properties.onTransferStart) {
              void onTransferEnd(activeNode, previousItem.node);
              void parent.properties.onTransferStart(
                activeNode,
                getChildren(graph, parent).findIndex(({ id }) => id === previousItem.node.id) + 1,
              );
              return null;
            }
          } else if (nextItem && nextItem.path) {
            const parent = getParent(graph, nextItem.node, nextItem.path);
            if (parent?.properties.onTransferStart) {
              void onTransferEnd(activeNode, previousItem.node);
              void parent.properties.onTransferStart(
                activeNode,
                getChildren(graph, parent).findIndex(({ id }) => id === nextItem.node.id),
              );
              return null;
            }
          }
        }
      }
      return undefined;
    },
    [root, items],
  );

  const handleDragEnd = useCallback(() => {
    onOpenItemIdsChange({ ...openItemIds });
  }, [onOpenItemIdsChange, openItemIds]);

  return (
    <ElevationProvider elevation='chrome'>
      <div
        role='none'
        className='bs-full overflow-hidden row-span-3 grid grid-cols-1 grid-rows-[min-content_1fr_min-content]'
      >
        <Surface role='search-input' limit={1} />
        {/* TODO(thure): what gives this an inline `overflow: initial`? */}
        <div role='none' className='!overflow-y-auto'>
          <NavTree
            id={root.id}
            items={items}
            current={activeIds}
            attended={attended}
            type={NODE_TYPE}
            onNavigate={handleNavigate}
            onItemOpenChange={handleItemOpenChange}
            open={openItemIds}
            onMove={handleMove}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            popoverAnchorId={popoverAnchorId}
            renderPresence={renderPresence}
            resolveItemLevel={resolveItemLevel}
            loadDescendents={loadDescendents}
          />
        </div>
        <NavTreeFooter layoutCoordinate={layoutCoordinate} />
      </div>
    </ElevationProvider>
  );
};
