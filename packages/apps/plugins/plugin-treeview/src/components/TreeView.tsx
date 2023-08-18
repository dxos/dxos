//
// Copyright 2023 DXOS.org
//

import { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getIndexAbove, getIndexBelow, getIndexBetween } from '@tldraw/indices';
import get from 'lodash.get';
import React, { useState } from 'react';

import { useDnd, useDragEnd, useDragOver } from '@braneframe/plugin-dnd';
import { Graph } from '@braneframe/plugin-graph';
import { Tree } from '@dxos/aurora';
import { Surface } from '@dxos/react-surface';

import { sortByIndex } from '../util';
import { BranchTreeItem, SortableBranchTreeItem } from './BranchTreeItem';
import { LeafTreeItem, SortableLeafTreeItem } from './LeafTreeItem';

export type TreeViewProps = {
  items?: Graph.Node[];
  parent?: string | Graph.Node;
};

const TreeViewSortableImpl = ({ parent, items }: { parent: Graph.Node; items: Graph.Node[] }) => {
  // todo(thure): `observer` does not trigger updates when node indices are updated.
  const itemsInOrder = items.sort(sortByIndex);
  const draggableIds = itemsInOrder.map(({ id }) => `treeitem:${id}`);
  const dnd = useDnd();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overIsMember, setOverIsMember] = useState(false);

  useDragEnd(
    ({ active, over }: DragEndEvent) => {
      // TODO(burdon): Use traversal instead of `get`?
      const activeNode = active?.data?.current?.treeitem as Graph.Node | null;
      const overNode = over?.data?.current?.treeitem as Graph.Node | null;
      if (activeNode && overNode && activeNode.parent?.id === parent.id) {
        if (parent.properties.onChildrenRearrange && overNode.parent?.id === parent.id) {
          if (overNode.id !== activeNode.id) {
            dnd.overlayDropAnimation = 'around';
            const activeIndex = itemsInOrder.findIndex(({ id }) => id === activeNode.id);
            const overIndex = itemsInOrder.findIndex(({ id }) => id === overNode.id);

            const beforeNode = itemsInOrder[overIndex > activeIndex ? overIndex : overIndex - 1];
            const afterNode = itemsInOrder[overIndex > activeIndex ? overIndex + 1 : overIndex];
            if (beforeNode?.properties.index === afterNode?.properties.index) {
              const nextActiveIndex = getIndexAbove(beforeNode.properties.index);
              const nextAfterIndex = getIndexAbove(nextActiveIndex);
              parent.properties.onChildrenRearrange(activeNode, nextActiveIndex);
              parent.properties.onChildrenRearrange(afterNode, nextAfterIndex);
            } else {
              parent.properties.onChildrenRearrange(
                activeNode,
                overIndex < 1
                  ? getIndexBelow(itemsInOrder[0].properties.index)
                  : getIndexBetween(beforeNode.properties.index, afterNode?.properties.index),
              );
            }
          }
        } else if (overNode.parent?.properties.onMoveNode) {
          dnd.overlayDropAnimation = 'into';
          overNode.parent?.properties.onMoveNode(overNode.parent, activeNode.parent!, activeNode, 'a1'); // TODO(burdon): Index.
        }
      }
      setActiveId(null);
      setOverIsMember(false);
    },
    [parent, itemsInOrder],
  );

  useDragOver(
    ({ active, over }) => {
      const node: Graph.Node | null = get(active, 'data.current.treeitem', null);
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
        item.properties?.role === 'branch' || item.children.length ? (
          <SortableBranchTreeItem key={item.id} node={item} rearranging={overIsMember && activeId === item.id} />
        ) : (
          <SortableLeafTreeItem key={item.id} node={item} rearranging={overIsMember && activeId === item.id} />
        ),
      )}
    </SortableContext>
  );
};

export const TreeView = (props: TreeViewProps) => {
  const { items } = props;
  // TODO(wittjosiah): Without `Array.from` we get an infinite render loop.
  const visibleItems = items && Array.from(items).filter((item) => !item.properties?.hidden);
  return (
    <Tree.Branch>
      {visibleItems?.length ? (
        typeof props.parent === 'object' && props.parent?.properties.onChildrenRearrange ? (
          <TreeViewSortableImpl items={visibleItems} parent={props.parent} />
        ) : (
          visibleItems
            .sort(sortByIndex)
            .map((item) =>
              item.properties?.role === 'branch' || item.children.length > 0 ? (
                <BranchTreeItem key={item.id} node={item} />
              ) : (
                <LeafTreeItem key={item.id} node={item} />
              ),
            )
        )
      ) : (
        <Surface role='tree--empty' data={props.parent} />
      )}
    </Tree.Branch>
  );
};
