//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { ClientProvider, useClient } from '@dxos/react-client';

const Test = () => {
  const client = useClient();

  return <pre>{JSON.stringify(client.toJSON(), null, 2)}</pre>;
};

const App = () => (
  <ClientProvider>
    <Test />
  </ClientProvider>
);

export default App;
