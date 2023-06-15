//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Tree } from '@dxos/aurora';
import { observer } from '@dxos/observable-object/react';

import { Surface } from '../../framework';
import { GraphNode } from '../GraphPlugin';
import { BranchTreeItem } from './BranchTreeItem';
import { LeafTreeItem } from './LeafTreeItem';

export type TreeViewProps = {
  items?: GraphNode[];
  parent?: 'root' | GraphNode;
};

export const TreeView = observer((props: TreeViewProps) => {
  const { items } = props;
  return (
    <Tree.Branch>
      {items?.length ? ( // TODO(wittjosiah): Without `Array.from` we get an infinite render loop.
        Array.from(items)
          .filter((item) => !item.attributes?.hidden)
          .map((item) =>
            item.children ? <BranchTreeItem key={item.id} node={item} /> : <LeafTreeItem key={item.id} node={item} />,
          )
      ) : (
        <Surface role='tree--empty' data={props.parent} />
      )}
    </Tree.Branch>
  );
});
