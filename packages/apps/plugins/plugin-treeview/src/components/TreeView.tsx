//
// Copyright 2023 DXOS.org
//

import { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getIndexAbove, getIndexBelow, getIndexBetween, sortByIndex } from '@tldraw/indices';
import get from 'lodash.get';
import React, { useState } from 'react';

import { useDnd, useDragEnd, useDragOver } from '@braneframe/plugin-dnd';
import { GraphNode } from '@braneframe/plugin-graph';
import { Tree } from '@dxos/aurora';
import { Surface } from '@dxos/react-surface';

import { BranchTreeItem, SortableBranchTreeItem } from './BranchTreeItem';
import { LeafTreeItem, SortableLeafTreeItem } from './LeafTreeItem';

export type TreeViewProps = {
  items?: GraphNode[];
  parent?: string | GraphNode;
  level?: number;
};

const TreeViewSortableImpl = ({ parent, items, level }: { parent: GraphNode; items: GraphNode[]; level: number }) => {
  // todo(thure): `observer` does not trigger updates when node indices are updated.
  const itemsInOrder = items.sort(sortByIndex);
  const draggableIds = itemsInOrder.map(({ id }) => `treeitem:${id}`);
  const dnd = useDnd();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overIsMember, setOverIsMember] = useState(false);

  useDragEnd(
    ({ active, over }: DragEndEvent) => {
      // TODO(burdon): Use traversal instead of `get`?
      const activeNode = active?.data?.current?.treeitem as GraphNode | null;
      const overNode = over?.data?.current?.treeitem as GraphNode | null;
      if (activeNode && overNode && activeNode.parent?.id === parent.id) {
        if (parent.onChildrenRearrange && overNode.parent?.id === parent.id) {
          if (overNode.id !== activeNode.id) {
            dnd.overlayDropAnimation = 'around';
            const activeIndex = itemsInOrder.findIndex(({ id }) => id === activeNode.id);
            const overIndex = itemsInOrder.findIndex(({ id }) => id === overNode.id);

            const beforeNode = itemsInOrder[overIndex > activeIndex ? overIndex : overIndex - 1];
            const afterNode = itemsInOrder[overIndex > activeIndex ? overIndex + 1 : overIndex];
            if (beforeNode?.index === afterNode?.index) {
              const nextActiveIndex = getIndexAbove(beforeNode.index);
              const nextAfterIndex = getIndexAbove(nextActiveIndex);
              parent.onChildrenRearrange(activeNode, nextActiveIndex);
              parent.onChildrenRearrange(afterNode, nextAfterIndex);
            } else {
              parent.onChildrenRearrange(
                activeNode,
                overIndex < 1
                  ? getIndexBelow(itemsInOrder[0].index)
                  : getIndexBetween(beforeNode.index, afterNode?.index),
              );
            }
          }
        } else if (overNode.parent?.onMoveNode) {
          dnd.overlayDropAnimation = 'into';
          overNode.parent?.onMoveNode(overNode.parent, activeNode.parent!, activeNode, 'a1'); // TODO(burdon): Index.
        }
      }
      setActiveId(null);
      setOverIsMember(false);
    },
    [parent, itemsInOrder],
  );

  useDragOver(
    ({ active, over }) => {
      const node: GraphNode | null = get(active, 'data.current.treeitem', null);
      setOverIsMember(
        !!node && get(node, 'parent.id') === parent.id && get(over, 'data.current.treeitem.parent.id') === parent.id,
      );
      setActiveId(node?.id ?? null);
    },
    [parent],
  );

  return (
    <SortableContext items={draggableIds} strategy={verticalListSortingStrategy}>
      {itemsInOrder.map((item) =>
        item.attributes?.role === 'branch' || Object.values(item.pluginChildren ?? {}).flat().length ? (
          <SortableBranchTreeItem
            key={item.id}
            node={item}
            level={level}
            rearranging={overIsMember && activeId === item.id}
          />
        ) : (
          <SortableLeafTreeItem
            key={item.id}
            node={item}
            level={level}
            rearranging={overIsMember && activeId === item.id}
          />
        ),
      )}
    </SortableContext>
  );
};

export const TreeView = (props: TreeViewProps) => {
  const { items, level = 0 } = props;
  // TODO(wittjosiah): Without `Array.from` we get an infinite render loop.
  const visibleItems = items && Array.from(items).filter((item) => !item.attributes?.hidden);
  return (
    <Tree.Branch>
      {visibleItems?.length ? (
        typeof props.parent === 'object' && props.parent?.onChildrenRearrange ? (
          <TreeViewSortableImpl items={visibleItems} level={level} parent={props.parent} />
        ) : (
          visibleItems
            .sort(sortByIndex)
            .map((item) =>
              item.attributes?.role === 'branch' || Object.values(item.pluginChildren ?? {}).flat().length > 0 ? (
                <BranchTreeItem key={item.id} node={item} level={level} />
              ) : (
                <LeafTreeItem key={item.id} node={item} level={level} />
              ),
            )
        )
      ) : (
        <Surface role='tree--empty' data={props.parent} />
      )}
    </Tree.Branch>
  );
};
