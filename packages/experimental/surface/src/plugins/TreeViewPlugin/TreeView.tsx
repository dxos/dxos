//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Tree } from '@dxos/aurora';
import { observer } from '@dxos/observable-object/react';

import { Surface } from '../../framework';
import { GraphNode } from '../GraphPlugin';

export type TreeViewProps = {
  items?: GraphNode[];
};

export const TreeView = observer((props: TreeViewProps) => {
  const { items } = props;
  return (
    <Tree.Branch>
      {items?.length // TODO(wittjosiah): Without `Array.from` we get an infinite render loop.
        ? Array.from(items)
            .filter((item) => !item.attributes?.hidden)
            .map((item) => <Surface key={item.id} role='treeitem' data={item} />)
        : 'no items'}
    </Tree.Branch>
  );
});
