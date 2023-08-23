//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Graph } from '@braneframe/plugin-graph';
import { List } from '@dxos/aurora';

import { NavTreeItem } from './NavTree';

export const TreeItemDragOverlay = ({ data }: { data: Graph.Node }) => {
  return (
    <List variant='unordered'>
      <NavTreeItem node={data} level={2} isOverlay />
    </List>
  );
};
