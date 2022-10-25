//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { ClientProvider, useSelection } from '@dxos/react-client';
import {
  ProfileInitializer,
  itemAdapter,
  useTestParty
} from '@dxos/react-client-testing';
import { FullScreen } from '@dxos/react-components';

import { EchoGrid, tableStyles } from '../src';

export default {
  title: 'KitchenSink/EchoGrid'
};

faker.seed(100);

const App = () => {
  const party = useTestParty();
  const items = useSelection(party?.select()) ?? [];

  return (
    <FullScreen>
      <EchoGrid items={items} itemAdapter={itemAdapter} styles={tableStyles} />
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
