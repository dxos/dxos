//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { GraphNode } from '@braneframe/plugin-graph';
import { List } from '@dxos/aurora';

import { LeafTreeItem } from './LeafTreeItem';

export const TreeItemDragOverlay = ({ data }: { data: GraphNode }) => {
  return (
    <List variant='unordered'>
      <LeafTreeItem node={data} isOverlay />
    </List>
  );
};
