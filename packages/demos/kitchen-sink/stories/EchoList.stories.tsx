//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { ClientProvider, ProfileInitializer, useSelection } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';

import { EchoList } from '../src';
import { itemAdapter, useTestParty } from './helpers';

export default {
  title: 'KitchenSink/EchoList'
};

faker.seed(100);

const App = () => {
  const party = useTestParty();

  // TODO(burdon): Filter out party item.
  const items = useSelection(party?.select()) ?? [];

  return (
    <FullScreen>
      <EchoList
        items={items.filter(item => item.type !== '')}
        itemAdapter={itemAdapter}
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
