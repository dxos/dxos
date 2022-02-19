//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { ClientProvider, ProfileInitializer, useSelection } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';

import { EchoTable } from '../src';
import { itemAdapter, tableStyles, useTestParty } from './helpers';

export default {
  title: 'KitchenSink/EchoTable'
};

faker.seed(100);

const App = () => {
  const party = useTestParty();
  const items = useSelection(party?.select()) ?? [];

  return (
    <FullScreen>
      <EchoTable
        items={items}
        itemAdapter={itemAdapter}
        styles={tableStyles}
      />
    </FullScreen>
  );
};

export const Primary = () => {
  return (
    <ClientProvider config={{}}>
      <ProfileInitializer>
        <App />
      </ProfileInitializer>
    </ClientProvider>
  );
};
