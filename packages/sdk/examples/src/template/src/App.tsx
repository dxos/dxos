//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { type Client, ClientProvider, type PublicKey } from '@dxos/react-client';
import { ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

import { Demo } from './components';

const App = ({ spaceKey, clients }: { spaceKey: PublicKey; clients: Client[] }) => {
  return (
    <ThemeProvider tx={defaultTx}>
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
