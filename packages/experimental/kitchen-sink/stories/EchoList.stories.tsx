//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { ClientProvider, useSelection } from '@dxos/react-client';
import { ProfileInitializer, itemAdapter, useTestSpace } from '@dxos/react-client-testing';
import { FullScreen } from '@dxos/react-components';

import { EchoList } from '../src';

export default {
  title: 'KitchenSink/EchoList'
};

faker.seed(100);

const App = () => {
  const space = useTestSpace();

  // TODO(burdon): Filter out space item.
  const items = useSelection(space?.select()) ?? [];

  return (
    <FullScreen>
      <EchoList items={items.filter((item) => item.type !== '')} itemAdapter={itemAdapter} />
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
