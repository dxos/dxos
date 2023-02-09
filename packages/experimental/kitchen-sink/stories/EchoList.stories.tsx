//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { ClientProvider } from '@dxos/react-client';
import { ProfileInitializer } from '@dxos/react-client-testing';

export default {
  title: 'KitchenSink/EchoList'
};

faker.seed(100);

const App = () => {
  // const space = useTestSpace();

  // // TODO(burdon): Filter out space item.
  // const items = useSelection(space?.select()) ?? [];

  // return (
  //   <FullScreen>
  //     <EchoList items={items.filter((item) => item.type !== '')} itemAdapter={itemAdapter} />
  //   </FullScreen>
  // );
  return null;
};

export const Primary = () => (
  <ClientProvider>
    <ProfileInitializer>
      <App />
    </ProfileInitializer>
  </ClientProvider>
);
