//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { ChevronRight as ExpandIcon, ExpandMore as CollapseIcon } from '@mui/icons-material';
import { TreeItem, TreeView } from '@mui/lab';

import { Item, DocumentModel } from '@dxos/client';
import { ClientProvider, useSelection } from '@dxos/react-client';

import { ProfileInitializer, useTestSpace } from '../src';

export default {
  title: 'react-client-testing/TestSpace'
};

// TODO(kaplanski): Factor out this component from devtools.
const ItemNode = ({ item }: { item: Item<DocumentModel> }) => {
  const children = item.select().children().exec().entities;

  return (
    <TreeItem nodeId={item.id} label={item.type}>
      {children.map((child) => (
        <ItemNode key={child.id} item={child} />
      ))}
    </TreeItem>
  );
};

const Story = () => {
  const space = useTestSpace();
  const items = useSelection(space?.select().filter((item) => !item.parent)) ?? [];

  return (
    <TreeView
      defaultCollapseIcon={<CollapseIcon />}
      defaultExpandIcon={<ExpandIcon />}
      sx={{
        flex: 1,
        maxWidth: 300,
        overflowY: 'auto'
      }}
    >
      {items?.map((item) => (
        <ItemNode key={item.id} item={item} />
      ))}
    </TreeView>
  );
};

export const Primary = () => (
  <ClientProvider>
    <ProfileInitializer>
      <Story />
    </ProfileInitializer>
  </ClientProvider>
);
