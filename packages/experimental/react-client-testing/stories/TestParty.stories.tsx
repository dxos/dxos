//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { ChevronRight as ExpandIcon, ExpandMore as CollapseIcon } from '@mui/icons-material';
import { TreeItem, TreeView } from '@mui/lab';

import { Item, ObjectModel } from '@dxos/client';
import { ClientProvider, useSelection } from '@dxos/react-client';

import { ProfileInitializer, useTestParty } from '../src';

export default {
  title: 'react-client-testing/TestParty'
};

// TODO(kaplanski): Factor out this component from devtools.
const ItemNode = ({ item }: { item: Item<ObjectModel> }) => {
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
  const party = useTestParty();
  const items =
    useSelection(
      party?.select().filter((item) => !item.parent),
      []
    ) ?? [];

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
