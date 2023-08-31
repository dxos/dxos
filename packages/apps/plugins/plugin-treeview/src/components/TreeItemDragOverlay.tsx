//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Graph } from '@braneframe/plugin-graph';
import { List, DensityProvider } from '@dxos/aurora';

import { NavTreeItem } from './NavTree';

export const TreeItemDragOverlay = ({ data }: { data: Graph.Node }) => {
  return (
    <DensityProvider density='fine'>
      <List variant='unordered'>
        <NavTreeItem node={data} level={3} isOverlay />
      </List>
    </DensityProvider>
  );
};
