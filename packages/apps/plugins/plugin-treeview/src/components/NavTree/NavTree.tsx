//
// Copyright 2023 DXOS.org
//

import { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getIndexAbove, getIndexBelow, getIndexBetween } from '@tldraw/indices';
import React, { useEffect, useMemo, useState } from 'react';

import { useDnd, useDragEnd, useDragOver, useDragStart } from '@braneframe/plugin-dnd';
import { Graph } from '@braneframe/plugin-graph';
import { Tree } from '@dxos/aurora';
import { Surface } from '@dxos/react-surface';

import { sortByIndex } from '../../util';
import { SortableTreeViewItem, NavTreeItem } from './NavTreeItem';

export type TreeViewProps = {
  level: number;
  items?: Graph.Node[];
  parent?: string | Graph.Node | null;
};

type NavTreeDropType = 'rearrange' | 'migrate-origin' | 'migrate-destination' | null;

const TreeViewSortableImpl = ({ parent, items, level }: { parent: Graph.Node; items: Graph.Node[]; level: number }) => {
  const dnd = useDnd();

  const [activeNode, setActiveNode] = useState<Graph.Node | null>(null);
  const [overIsDroppable, setOverIsDroppable] = useState<NavTreeDropType>(null);

  const [itemsInOrder, setItemsInOrder] = useState(items.sort(sortByIndex));
  const itemIds = useMemo(() => itemsInOrder.map(({ id }) => `treeitem:${id}`), [itemsInOrder]);

  useEffect(() => {
    return setItemsInOrder(items.sort(sortByIndex));
  }, [items, parent.id]);

  useDragStart(({ active }) => {
    setActiveNode(active.data?.current?.treeitem ?? null);
  }, []);

  useDragEnd(
    ({ over }: DragEndEvent) => {
      const overNode: Graph.Node | null = over?.data?.current?.treeitem ?? null;
      if (activeNode && overNode) {
        if (overIsDroppable === 'rearrange') {
          dnd.overlayDropAnimation = 'around';
          if (overNode.id !== activeNode.id) {
            const activeIndex = itemsInOrder.findIndex(({ id }) => id === activeNode.id);
            const overIndex = itemsInOrder.findIndex(({ id }) => id === overNode.id);

            const beforeNode = itemsInOrder[overIndex > activeIndex ? overIndex : overIndex - 1];
            const afterNode = itemsInOrder[overIndex > activeIndex ? overIndex + 1 : overIndex];
            if (beforeNode?.properties.index === afterNode?.properties.index) {
              const nextActiveIndex = getIndexAbove(beforeNode?.properties.index);
              const nextAfterIndex = getIndexAbove(nextActiveIndex);
              parent.properties.onRearrangeChild(activeNode, nextActiveIndex);
              parent.properties.onRearrangeChild(afterNode, nextAfterIndex);
            } else {
              parent.properties.onRearrangeChild(
                activeNode,
                overIndex < 1
                  ? getIndexBelow(itemsInOrder[0]?.properties.index)
                  : getIndexBetween(beforeNode?.properties.index, afterNode?.properties.index),
              );
            }
            setItemsInOrder(parent.children.sort(sortByIndex));
          }
        } else if (overIsDroppable === 'migrate-destination') {
          dnd.overlayDropAnimation = 'around';
          if (overNode.parent?.properties.onMigrateStartChild) {
            const overIndex = itemsInOrder.findIndex(({ id }) => id === overNode.id);
            const migratedIndex =
              overIndex < 1
                ? getIndexBelow(itemsInOrder[overIndex + 1]?.properties.index)
                : getIndexBetween(
                    itemsInOrder[overIndex - 1]?.properties.index,
                    itemsInOrder[overIndex + 1]?.properties.index,
                  );
            overNode.parent?.properties.onMigrateStartChild(activeNode, overNode.parent, migratedIndex);
          }
        } else if (overIsDroppable === 'migrate-origin') {
          activeNode.parent?.properties.onMigrateEndChild?.(activeNode);
        }
      }
      setActiveNode(null);
      setOverIsDroppable(null);
    },
    [parent, activeNode, overIsDroppable, itemsInOrder],
  );

  useDragOver(
    ({ over }) => {
      let dropType: NavTreeDropType = null;

      if (over?.data?.current?.treeitem && activeNode) {
        const overNode: Graph.Node = over.data.current.treeitem;
        if (
          parent.properties.onRearrangeChild &&
          activeNode.parent?.id === parent.id &&
          overNode.parent?.id === parent.id
        ) {
          // rearrange relevant & supported
          dropType = 'rearrange';
        } else if (
          activeNode.parent?.id !== overNode.parent?.id &&
          activeNode.properties?.migrationClass &&
          overNode.parent?.properties?.acceptMigrationClass?.has(activeNode.properties.migrationClass)
        ) {
          // migration relevant
          if (overNode.parent?.id === parent.id) {
            dropType = 'migrate-destination';
          } else if (activeNode.parent?.id === parent.id) {
            dropType = 'migrate-origin';
          }
        }
      }

      setOverIsDroppable(dropType);

      setItemsInOrder((itemsCurrent) => {
        const overNode: Graph.Node | null = over?.data?.current?.treeitem ?? null;
        if (overNode && activeNode) {
          const overIndex = itemsCurrent.findIndex(({ id }) => id === overNode?.id);
          switch (dropType) {
            case 'migrate-origin':
              return itemsCurrent.filter(({ id }) => id !== activeNode?.id);
            case 'migrate-destination':
              if (overIndex >= 0) {
                return [
                  ...items.slice(0, overIndex),
                  {
                    ...activeNode!,
                    id: 'migration-subject',
                    parent,
                    properties: { isPreview: true },
                  },
                  ...items.slice(overIndex, items.length),
                ];
              } else {
                return itemsCurrent;
              }
            case 'rearrange':
            default:
              return itemsCurrent.length !== items.length ? items.sort(sortByIndex) : itemsCurrent;
          }
        } else {
          return itemsCurrent;
        }
      });
    },
    [activeNode, parent, items],
  );

  return (
    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
      {itemsInOrder.map((item) => (
        <SortableTreeViewItem
          key={item.id}
          node={item}
          level={level}
          rearranging={overIsDroppable === 'rearrange' && activeNode?.id === item.id}
          isPreview={item.properties?.isPreview}
        />
      ))}
    </SortableContext>
  );
};

export const NavTree = (props: TreeViewProps) => {
  const { items, level } = props;
  // TODO(wittjosiah): Without `Array.from` we get an infinite render loop.
  const visibleItems = items && Array.from(items).filter((item) => !item.properties?.hidden);
  return (
    <Tree.Branch>
      {visibleItems?.length ? (
        typeof props.parent === 'object' && props.parent?.properties.onRearrangeChild ? (
          <TreeViewSortableImpl items={visibleItems} parent={props.parent} level={level} />
        ) : (
          visibleItems.sort(sortByIndex).map((item) => <NavTreeItem key={item.id} node={item} level={level} />)
        )
      ) : (
        <Surface role='tree--empty' data={props.parent} />
      )}
    </Tree.Branch>
  );
};
