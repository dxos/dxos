//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { ClientProvider, ProfileInitializer, useSelection } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';

import { EchoBoard } from '../src';
import { useTestParty } from './helpers';

export default {
  title: 'KitchenSink/EchoBoard'
};

faker.seed(100);

const App = () => {
  const party = useTestParty();
  const items = useSelection(party?.select()) ?? [];

  return (
    <FullScreen>
      <EchoBoard
        items={items}
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
