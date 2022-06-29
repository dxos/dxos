//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { ItemID } from '@dxos/echo-protocol';
import { ObjectModel } from '@dxos/object-model';
import { ClientProvider, useSelection } from '@dxos/react-client';
import { ProfileInitializer, itemAdapter, useTestParty } from '@dxos/react-client-testing';
import { FullScreen } from '@dxos/react-components';

import { EchoBoard } from '../src';

export default {
  title: 'KitchenSink/EchoBoard'
};

faker.seed(100);

const App = () => {
  const party = useTestParty();
  const items = useSelection(party?.select()) ?? [];

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
        itemAdapter={itemAdapter}
        items={items}
        onCreateItem={handleCreateItem}
      />
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
