//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { ItemID } from '@dxos/protocols';
import { ClientProvider, useSelection } from '@dxos/react-client';
import { ProfileInitializer, itemAdapter, useTestSpace } from '@dxos/react-client-testing';
import { FullScreen } from '@dxos/react-components';

import { EchoBoard } from '../src';

export default {
  title: 'KitchenSink/EchoBoard'
};

faker.seed(100);

const App = () => {
  const space = useTestSpace();
  const items = useSelection(space?.select()) ?? [];

  const handleCreateItem = (type: string, title: string, parentId?: ItemID) => {
    void space?.database.createItem({
      type,
      parent: parentId,
      props: {
        name: title // TODO(burdon): Use adapter.
      }
    });
  };

  return (
    <FullScreen>
      <EchoBoard itemAdapter={itemAdapter} items={items} onCreateItem={handleCreateItem} />
    </FullScreen>
  );
};

export const Primary = () => (
  <ClientProvider>
    <ProfileInitializer>
      <App />
    </ProfileInitializer>
  </ClientProvider>
);
