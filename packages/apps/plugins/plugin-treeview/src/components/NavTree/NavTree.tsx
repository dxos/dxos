//
// Copyright 2023 DXOS.org
//

import { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getIndexAbove, getIndexBelow, getIndexBetween } from '@tldraw/indices';
import React, { useEffect, useMemo, useState } from 'react';

import { useDnd, useDragEnd, useDragOver, useDragStart } from '@braneframe/plugin-dnd';
import type { Graph } from '@braneframe/plugin-graph';
import { Tree, TreeRootProps } from '@dxos/aurora';
import { getDndId, Mosaic, StackTile, useMosaic } from '@dxos/aurora-grid';
import { Surface } from '@dxos/react-surface';

import { DroppableTreeViewItem, SortableTreeViewItem } from './NavTreeItem';
import { getPersistenceParent, sortByIndex } from '../../util';

export type TreeViewProps = {
  level: number;
  items?: Graph.Node[];
  node?: string | Graph.Node | null;
} & TreeRootProps;

export const NavTree = (props: TreeViewProps) => {
  const { items, level, node, ...branchProps } = props;
  // TODO(wittjosiah): Without `Array.from` we get an infinite render loop.
  const visibleItems = items && Array.from(items).filter((item) => !item.properties?.hidden);
  const Root = level === 0 ? Tree.Root : Tree.Branch;
  return (
    <Root {...branchProps}>
      {node && visibleItems?.length ? (
        <TreeViewSortableImpl items={visibleItems} node={node as Graph.Node} level={level} />
      ) : (
        <Surface role='tree--empty' data={node} />
      )}
    </Root>
  );
};

type NavTreeDropType = 'rearrange' | 'migrate-origin' | 'migrate-destination' | null;

/**
 * @internal Storybook only
 */
export const NavTreeRoot = ({ id }: { id: string }) => {
  const {
    mosaic: {
      tiles: { [getDndId(id, 'root')]: root },
    },
  } = useMosaic();

  return <Mosaic.Stack {...(root as StackTile)} variant='stack' />;
};

/**
 * @internal Storybook only
 */
export const TreeViewSortableImpl = ({
  node,
  items,
  level,
}: {
  node: Graph.Node;
  items: Graph.Node[];
  level: number;
}) => {
  const dnd = useDnd();

  const [activeNode, setActiveNode] = useState<Graph.Node | null>(null);
  const [overIsDroppable, setOverIsDroppable] = useState<NavTreeDropType>(null);
  const [migrateIntoId, setMigrateIntoId] = useState<string | null>(null);

  const [itemsInOrder, setItemsInOrder] = useState(items.sort(sortByIndex));
  const itemIds = useMemo(() => itemsInOrder.map(({ id }) => `treeitem:${id}`), [itemsInOrder]);

  useEffect(() => {
    return setItemsInOrder(items.sort(sortByIndex));
  }, [items, node.id]);

  useDragStart(({ active }) => {
    setActiveNode(active.data?.current?.treeitem ?? null);
  }, []);

  useDragEnd(
    ({ over }: DragEndEvent) => {
      const overNode: Graph.Node | null = over?.data?.current?.treeitem ?? null;
      if (activeNode && overNode) {
        if (overIsDroppable === 'rearrange' && activeNode.parent?.id === node.id) {
          dnd.overlayDropAnimation = 'around';
          if (overNode.id !== activeNode.id) {
            const activeIndex = itemsInOrder.findIndex(({ id }) => id === activeNode.id);
            const overIndex = itemsInOrder.findIndex(({ id }) => id === overNode.id);

            const beforeNode = itemsInOrder[overIndex > activeIndex ? overIndex : overIndex - 1];
            const afterNode = itemsInOrder[overIndex > activeIndex ? overIndex + 1 : overIndex];
            if (beforeNode?.properties.index === afterNode?.properties.index) {
              const nextActiveIndex = getIndexAbove(beforeNode?.properties.index);
              const nextAfterIndex = getIndexAbove(nextActiveIndex);
              const activePersistParent = getPersistenceParent(activeNode, activeNode?.properties.persistenceClass);
              activePersistParent?.properties.onRearrangeChild(activeNode, nextActiveIndex);
              const afterPersistParent = getPersistenceParent(afterNode, afterNode?.properties.persistenceClass);
              afterPersistParent?.properties.onRearrangeChild(afterNode, nextAfterIndex);
            } else {
              const activePersistParent = getPersistenceParent(activeNode, activeNode?.properties.persistenceClass);
              activePersistParent?.properties.onRearrangeChild(
                activeNode,
                overIndex < 1
                  ? getIndexBelow(itemsInOrder[0]?.properties.index)
                  : getIndexBetween(beforeNode?.properties.index, afterNode?.properties.index),
              );
            }
            setItemsInOrder([...node.children.sort(sortByIndex)]);
          }
        } else if (overIsDroppable === 'migrate-destination') {
          dnd.overlayDropAnimation = 'into';
          const overPersistParent = overNode?.properties?.acceptPersistenceClass?.has(
            activeNode.properties.persistenceClass,
          )
            ? overNode
            : getPersistenceParent(overNode, activeNode.properties.persistenceClass);
          if (overPersistParent?.properties.onMigrateStartChild) {
            const overIndex = itemsInOrder.findIndex(({ id }) => id === overNode.id);
            const migratedIndex =
              overIndex < 0
                ? getIndexBelow(itemsInOrder[0]?.properties.index)
                : getIndexBetween(
                    itemsInOrder[overIndex - 1]?.properties.index,
                    itemsInOrder[overIndex]?.properties.index,
                  );
            overPersistParent?.properties.onMigrateStartChild(activeNode, overPersistParent, migratedIndex);
          }
        } else if (overIsDroppable === 'migrate-origin') {
          const activePersistParent = getPersistenceParent(activeNode, activeNode?.properties.persistenceClass);
          activePersistParent?.properties?.onMigrateEndChild?.(activeNode);
        }
      }
      setActiveNode(null);
      setOverIsDroppable(null);
    },
    [node, activeNode, overIsDroppable, itemsInOrder],
  );

  useDragOver(
    ({ over }) => {
      let dropType: NavTreeDropType = null;
      let dropId: string | null = null;

      if (over?.data?.current?.treeitem && activeNode) {
        const overNode: Graph.Node = over.data.current.treeitem;
        const activePersistParent = getPersistenceParent(activeNode, activeNode.properties.persistenceClass);
        const overPersistParent = overNode?.properties?.acceptPersistenceClass?.has(
          activeNode.properties.persistenceClass,
        )
          ? overNode
          : getPersistenceParent(overNode, activeNode.properties.persistenceClass);
        if (
          activePersistParent?.properties.onRearrangeChild &&
          activeNode.parent?.id === node.id &&
          overNode.parent?.id === node.id
        ) {
          // rearrange relevant & supported
          dropType = 'rearrange';
        } else if (
          activeNode.properties.persistenceClass &&
          overPersistParent?.properties?.acceptPersistenceClass.has(activeNode.properties.persistenceClass) &&
          activePersistParent?.id !== overPersistParent?.id
        ) {
          // migration relevant
          if (itemIds.includes(`treeitem:${overPersistParent?.id}`)) {
            dropType = 'migrate-destination';
            dropId = overPersistParent!.id;
          } else if (activeNode.parent?.id === node.id) {
            dropType = 'migrate-origin';
          }
        }
      }

      setOverIsDroppable(dropType);
      setMigrateIntoId(dropId);
    },
    [activeNode, node, items],
  );

  const ItemRoot = level === 0 ? DroppableTreeViewItem : SortableTreeViewItem;

  return (
    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
      {itemsInOrder.map((item) => (
        <ItemRoot
          key={item.id}
          node={item}
          level={level}
          rearranging={overIsDroppable === 'rearrange' && activeNode?.id === item.id}
          migrating={
            overIsDroppable === 'migrate-origin' && activeNode?.id === item.id
              ? ('away' as const)
              : overIsDroppable === 'migrate-destination' && migrateIntoId === item.id
              ? ('into' as const)
              : undefined
          }
          isPreview={item.properties?.isPreview}
        />
      ))}
    </SortableContext>
  );
};
