//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { ItemID } from '@dxos/echo-protocol';
import { ObjectModel } from '@dxos/object-model';
import { ClientProvider, ProfileInitializer, useSelection } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';

import { EchoBoard } from '../src';
import { itemAdapter, useTestParty } from './helpers';

export default {
  title: 'KitchenSink/EchoBoard'
};

faker.seed(100);

const App = () => {
  const party = useTestParty();
  const items = useSelection(party?.select()) ?? [];

  // TODO(burdon): Doesn't trigger update.
  const handleCreateItem = (type: string, title: string, parentId?: ItemID) => {
    void party?.database.createItem({
      model: ObjectModel, // TODO(burdon): Set as default.
      type,
      parent: parentId,
      props: {
        title
      }
    });
  };

  return (
    <FullScreen>
      <EchoBoard
        items={items}
        itemAdapter={itemAdapter}
        onCreateItem={handleCreateItem}
      />
    </FullScreen>
  );
};

export const Primary = () => {
  return (
    <ClientProvider>
      <ProfileInitializer>
        <App />
      </ProfileInitializer>
    </ClientProvider>
  );
};
