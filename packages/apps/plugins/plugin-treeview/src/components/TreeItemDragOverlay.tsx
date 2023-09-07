//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Graph } from '@braneframe/plugin-graph';
import { List, DensityProvider } from '@dxos/aurora';

import { NavTreeItem } from './NavTree';

const getDepth = (node: Graph.Node, depth = -1): number => {
  if (!node.parent) {
    return depth;
  } else {
    return getDepth(node.parent, depth + 1);
  }
};

export const TreeItemDragOverlay = ({ data }: { data: Graph.Node }) => {
  return (
    <DensityProvider density='fine'>
      <List variant='unordered'>
        <NavTreeItem node={data} level={Math.max(0, getDepth(data))} isOverlay />
      </List>
    </DensityProvider>
  );
};
