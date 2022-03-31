//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { ChevronRight as ExpandIcon, ExpandMore as CollapseIcon } from '@mui/icons-material';
import { TreeItem, TreeView } from '@mui/lab';

import { Item, Party } from '@dxos/client';
import { ObjectModel } from '@dxos/object-model';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientProvider, ProfileInitializer, useClient, useSelection } from '@dxos/react-client';

export default {
  title: 'react-client-testing/TestTable'
};

const ItemNode = ({ item }: { item: Item<ObjectModel> }) => {
  const children = useSelection(item.select().children(), []);

  return (
    <TreeItem nodeId={item.id} label={item.type}>
      {children?.map((child) => (
        <ItemNode key={child.id} item={child} />
      ))}
    </TreeItem>
  );
};

const Story = () => {
  const client = useClient();
  const [party, setParty] = useState<Party>();
  const table = useTestTable(party);

  useAsyncEffect(async () => {
    const party = await client.echo.createParty();
    setParty(party);
  }, []);

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
      {table && (
        <ItemNode
          key={table.id}
          item={table}
        />
      )}
    </TreeView>
  );
};

export const Primary = () => {
  return (
    <ClientProvider>
      <ProfileInitializer>
        <Story />
      </ProfileInitializer>
    </ClientProvider>
  );
};
