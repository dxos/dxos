//
// Copyright 2023 DXOS.org
//

import { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getIndexBelow, getIndexBetween, sortByIndex } from '@tldraw/indices';
import get from 'lodash.get';
import React, { useState } from 'react';

import { useDnd, useDragEnd, useDragOver } from '@braneframe/plugin-dnd';
import { GraphNode } from '@braneframe/plugin-graph';
import { Tree } from '@dxos/aurora';
import { observer } from '@dxos/observable-object/react';
import { Surface } from '@dxos/react-surface';

import { BranchTreeItem, SortableBranchTreeItem } from './BranchTreeItem';
import { LeafTreeItem, SortableLeafTreeItem } from './LeafTreeItem';

export type TreeViewProps = {
  items?: GraphNode[];
  parent?: string | GraphNode;
};

const TreeViewSortableImpl = observer(({ parent, items }: { parent: GraphNode; items: GraphNode[] }) => {
  // todo(thure): `observer` does not trigger updates when node indices are updated.
  const itemsInOrder = items.sort(sortByIndex);
  const draggableIds = itemsInOrder.map(({ id }) => `treeitem:${id}`);
  const dnd = useDnd();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overIsMember, setOverIsMember] = useState(false);

  useDragEnd(
    ({ active, over }: DragEndEvent) => {
      const node: GraphNode | null = get(active, 'data.current.treeitem', null);
      if (
        parent.onChildrenRearrange &&
        node &&
        get(node, 'parent.id') === parent.id &&
        get(over, 'data.current.treeitem.parent.id') === parent.id
      ) {
        dnd.overlayDropAnimation = 'around';
        const overId = get(over, 'data.current.treeitem.id', null);
        if (overId !== null && overId !== node.id) {
          const activeIndex = itemsInOrder.findIndex(({ id }) => id === node.id);
          const overIndex = itemsInOrder.findIndex(({ id }) => id === overId);
          parent.onChildrenRearrange(
            node,
            overIndex < 1
              ? getIndexBelow(itemsInOrder[0].index)
              : getIndexBetween(
                  itemsInOrder[overIndex > activeIndex ? overIndex : overIndex - 1].index,
                  itemsInOrder[overIndex > activeIndex ? overIndex + 1 : overIndex]?.index,
                ),
          );
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
        item.children ? (
          <SortableBranchTreeItem key={item.id} node={item} rearranging={overIsMember && activeId === item.id} />
        ) : (
          <SortableLeafTreeItem key={item.id} node={item} rearranging={overIsMember && activeId === item.id} />
        ),
      )}
    </SortableContext>
  );
});

export const TreeView = observer((props: TreeViewProps) => {
  const { items } = props;
  // TODO(wittjosiah): Without `Array.from` we get an infinite render loop.
  const visibleItems = items && Array.from(items).filter((item) => !item.attributes?.hidden);
  return (
    <Tree.Branch>
      {visibleItems?.length ? (
        typeof props.parent === 'object' && props.parent?.onChildrenRearrange ? (
          <TreeViewSortableImpl items={visibleItems} parent={props.parent} />
        ) : (
          visibleItems
            .sort(sortByIndex)
            .map((item) =>
              item.children ? <BranchTreeItem key={item.id} node={item} /> : <LeafTreeItem key={item.id} node={item} />,
            )
        )
      ) : (
        <Surface role='tree--empty' data={props.parent} />
      )}
    </Tree.Branch>
  );
});
