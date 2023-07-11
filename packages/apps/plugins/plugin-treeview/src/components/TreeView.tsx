//
// Copyright 2023 DXOS.org
//

import { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getIndexBetween, sortByIndex } from '@tldraw/indices';
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

const TreeViewSortableImpl = observer(({ parent, items }: { parent: GraphNode; items: GraphNode[] }) => {
  const [_, setIter] = useState([]);
  const itemsInOrder = items.sort(sortByIndex);
  const draggableIds = itemsInOrder.map(({ id }) => `treeitem:${id}`);
  const dnd = useDnd();

  console.log(
    '[tree view sortable]',
    itemsInOrder.map(({ index }) => index),
  );

  useDragEnd(
    ({ active, over }: DragEndEvent) => {
      const node: GraphNode | null = get(active, 'data.current.entity', null);
      if (node && get(node, 'parent.id') === parent.id && get(over, 'data.current.entity.parent.id') === parent.id) {
        dnd.overlayDropAnimation = 'around';
        const overId = get(over, 'data.current.entity.id', 'never');
        if (overId !== 'never' && overId !== get(node, 'id')) {
          const index = itemsInOrder.findIndex(({ id }) => id === overId);
          const nextIndex = getIndexBetween(itemsInOrder[index].index, itemsInOrder[index + 1]?.index);
          console.log(
            '[drag end]',
            itemsInOrder[index].index,
            itemsInOrder[index + 1]?.index,
            itemsInOrder.map(({ index }) => index),
            nextIndex,
          );
          (node as GraphNode).index = nextIndex;
          setIter([]);
        }
      }
    },
    [parent],
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
