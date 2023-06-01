//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Client, ClientProvider, PublicKey } from '@dxos/react-client';

import { Demo } from './components';

const App = ({ spaceKey, clients }: { spaceKey: PublicKey; clients: Client[] }) => {
  return (
    <>
      {clients.map((client, id) => (
        <ClientProvider key={id} client={client}>
          <Demo spaceKey={spaceKey} id={id} />
        </ClientProvider>
      ))}
    </>
  );
};

export default App;
