//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { ClientProvider } from '@dxos/react-client';
import { ProfileInitializer } from '@dxos/react-client-testing';

export default {
  title: 'KitchenSink/EchoGrid'
};

faker.seed(100);

const App = () => {
  // const space = useTestSpace();
  // const items = useSelection(space?.select()) ?? [];

  // return (
  //   <FullScreen>
  //     <EchoGrid items={items} itemAdapter={itemAdapter} styles={tableStyles} />
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
