//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SessionNode } from '@braneframe/plugin-session';
import { List } from '@dxos/aurora';

import { LeafTreeItem } from './LeafTreeItem';

export const TreeItemDragOverlay = ({ data }: { data: SessionNode }) => {
  return (
    <List variant='unordered'>
      <LeafTreeItem node={data} isOverlay />
    </List>
  );
};
