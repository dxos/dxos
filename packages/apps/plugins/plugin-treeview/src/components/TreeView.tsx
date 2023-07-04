//
// Copyright 2023 DXOS.org
//

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

export const TreeView = observer((props: TreeViewProps) => {
  const { items } = props;
  const visibleItems = items && Array.from(items).filter((item) => !item.attributes?.hidden);
  return (
    <Tree.Branch>
      {visibleItems?.length ? ( // TODO(wittjosiah): Without `Array.from` we get an infinite render loop.
        visibleItems.map((item) =>
          Object.values(item.pluginChildren ?? {}).length > 0 ? (
            <BranchTreeItem key={item.id} node={item} />
          ) : (
            <LeafTreeItem key={item.id} node={item} />
          ),
        )
      ) : (
        <Surface role='tree--empty' data={props.parent} />
      )}
    </Tree.Branch>
  );
});
