//
// Copyright 2023 DXOS.org
//

import { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getIndexBelow, getIndexBetween, sortByIndex } from '@tldraw/indices';
import get from 'lodash.get';
import React, { useState } from 'react';

import { useDnd, useDragEnd } from '@braneframe/plugin-dnd';
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

const TreeViewSortableImpl = ({ parent, items }: { parent: GraphNode; items: GraphNode[] }) => {
  // todo(thure): `observer` does not trigger updates when node indices are updated.
  const [iter, setIter] = useState([]);
  const itemsInOrder = items.sort(sortByIndex);
  const draggableIds = itemsInOrder.map(({ id }) => `treeitem:${id}`);
  const dnd = useDnd();

  useDragEnd(
    ({ active, over }: DragEndEvent) => {
      const node: GraphNode | null = get(active, 'data.current.entity', null);
      if (node && get(node, 'parent.id') === parent.id && get(over, 'data.current.entity.parent.id') === parent.id) {
        dnd.overlayDropAnimation = 'around';
        const overId = get(over, 'data.current.entity.id', 'never');
        if (overId !== 'never' && overId !== node.id) {
          const activeIndex = itemsInOrder.findIndex(({ id }) => id === node.id);
          const overIndex = itemsInOrder.findIndex(({ id }) => id === overId);
          (node as GraphNode).index =
            overIndex < 1
              ? getIndexBelow(itemsInOrder[0].index)
              : getIndexBetween(
                  itemsInOrder[overIndex > activeIndex ? overIndex : overIndex - 1].index,
                  itemsInOrder[overIndex > activeIndex ? overIndex + 1 : overIndex]?.index,
                );
          setIter([]);
        }
      }
    },
    [parent, itemsInOrder, iter],
  );

  return (
    <SortableContext items={draggableIds} strategy={verticalListSortingStrategy}>
      {itemsInOrder.map((item) =>
        item.children ? (
          <SortableBranchTreeItem key={item.id} node={item} />
        ) : (
          <SortableLeafTreeItem key={item.id} node={item} />
        ),
      )}
    </SortableContext>
  );
};

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
