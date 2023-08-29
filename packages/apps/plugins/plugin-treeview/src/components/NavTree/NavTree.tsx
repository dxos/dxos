//
// Copyright 2023 DXOS.org
//

import { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getIndexAbove, getIndexBelow, getIndexBetween } from '@tldraw/indices';
import React, { useState } from 'react';

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

const TreeViewSortableImpl = ({ parent, items, level }: { parent: Graph.Node; items: Graph.Node[]; level: number }) => {
  // todo(thure): `observer` does not trigger updates when node indices are updated.
  const itemsInOrder = items.sort(sortByIndex);
  const draggableIds = itemsInOrder.map(({ id }) => `treeitem:${id}`);
  const dnd = useDnd();

  const [activeNode, setActiveNode] = useState<Graph.Node | null>(null);
  const [overIsDroppable, setOverIsDroppable] = useState<'rearrange' | 'migrate' | null>(null);

  useDragStart(({ active }) => {
    setActiveNode(active.data?.current?.treeitem ?? null);
  }, []);

  useDragEnd(
    ({ over }: DragEndEvent) => {
      const overNode: Graph.Node | null = over?.data?.current?.treeitem ?? null;
      if (activeNode && overNode) {
        if (overIsDroppable === 'rearrange') {
          console.log('[drag end]', 'rearrange');
          dnd.overlayDropAnimation = 'around';
          if (overNode.id !== activeNode.id) {
            const activeIndex = itemsInOrder.findIndex(({ id }) => id === activeNode.id);
            const overIndex = itemsInOrder.findIndex(({ id }) => id === overNode.id);

            const beforeNode = itemsInOrder[overIndex > activeIndex ? overIndex : overIndex - 1];
            const afterNode = itemsInOrder[overIndex > activeIndex ? overIndex + 1 : overIndex];
            if (beforeNode?.properties.index === afterNode?.properties.index) {
              const nextActiveIndex = getIndexAbove(beforeNode.properties.index);
              const nextAfterIndex = getIndexAbove(nextActiveIndex);
              parent.properties.onRearrangeChild(activeNode, nextActiveIndex);
              parent.properties.onRearrangeChild(afterNode, nextAfterIndex);
            } else {
              parent.properties.onRearrangeChild(
                activeNode,
                overIndex < 1
                  ? getIndexBelow(itemsInOrder[0].properties.index)
                  : getIndexBetween(beforeNode.properties.index, afterNode?.properties.index),
              );
            }
          }
        } else if (overIsDroppable === 'migrate' && overNode.parent?.properties.onMigrateChild) {
          console.log('[drag end]', 'migrate');
          dnd.overlayDropAnimation = 'around';
          const overSiblings = overNode.parent?.children.sort(sortByIndex);
          const overIndex = overSiblings.findIndex(({ id }) => id === overNode.id);
          const migratedIndex =
            overIndex < 1
              ? getIndexBelow(overSiblings[0].properties.index)
              : getIndexBetween(overSiblings[overIndex - 1].properties.index, overSiblings[overIndex].properties.index);
          overNode.parent?.properties.onMigrateChild(activeNode, overNode.parent, migratedIndex);
        }
      }
      setActiveNode(null);
      setOverIsDroppable(null);
    },
    [parent, activeNode, overIsDroppable, itemsInOrder],
  );

  useDragOver(
    ({ over }) => {
      console.log('[drag over]', activeNode, over?.data);
      if (over?.data?.current?.treeitem && activeNode) {
        const overNode: Graph.Node = over.data.current.treeitem;
        if (
          parent.properties.onRearrangeChild &&
          activeNode.parent?.id === parent.id &&
          overNode.parent?.id === parent.id
        ) {
          console.log('[drag over]', 'rearrange');
          setOverIsDroppable('rearrange');
        } else if (
          activeNode.properties?.migrationClass &&
          overNode.parent?.properties?.acceptMigrationClass?.has(activeNode.properties.migrationClass)
        ) {
          console.log('[drag over]', 'migrate');
          setOverIsDroppable('migrate');
        } else {
          console.log('[drag over]', null);
          setOverIsDroppable(null);
        }
      }
    },
    [activeNode, parent],
  );

  return (
    <SortableContext items={draggableIds} strategy={verticalListSortingStrategy}>
      {itemsInOrder.map((item) => (
        <SortableTreeViewItem
          key={item.id}
          node={item}
          level={level}
          rearranging={overIsDroppable === 'rearrange' && activeNode?.id === item.id}
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
