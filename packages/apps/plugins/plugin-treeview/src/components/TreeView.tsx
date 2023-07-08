//
// Copyright 2023 DXOS.org
//

import { SortableContext } from '@dnd-kit/sortable';
import { sortByIndex } from '@tldraw/indices';
import React from 'react';

import { GraphNode } from '@braneframe/plugin-graph';
import { Tree } from '@dxos/aurora';
import { observer } from '@dxos/observable-object/react';
import { Surface } from '@dxos/react-surface';

import { BranchTreeItem } from './BranchTreeItem';
import { LeafTreeItem } from './LeafTreeItem';

export type TreeViewProps = {
  items?: GraphNode[];
  parent?: string | GraphNode;
};

const TreeViewSortableImpl = ({ parent, items }: { parent: GraphNode; items: GraphNode[] }) => {
  const itemsInOrder = items.sort(sortByIndex);
  const itemOrder = itemsInOrder.map(({ id }) => id);
  return (
    <SortableContext id={parent.id} items={itemOrder}>
      {itemsInOrder.map((item) =>
        item.children ? (
          <BranchTreeItem key={item.id} node={item} sortable />
        ) : (
          <LeafTreeItem key={item.id} node={item} sortable />
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
