//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { ThemeProvider } from '@dxos/aurora';
import { appTx } from '@dxos/aurora-theme';
import { Client, ClientProvider, PublicKey } from '@dxos/react-client';

import { Demo } from './components';

const App = ({ spaceKey, clients }: { spaceKey: PublicKey; clients: Client[] }) => {
  return (
    <ThemeProvider tx={appTx}>
      <div className='flex place-content-evenly'>
        {clients.map((client, id) => (
          <ClientProvider key={id} client={client}>
            <Demo spaceKey={spaceKey} id={id} />
          </ClientProvider>
        ))}
      </div>
    </ThemeProvider>
  );
};

export default App;
