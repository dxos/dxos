//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { ClientProvider } from '@dxos/react-client';
import { Heading, Loading, Main } from '@dxos/react-ui';

import { Composer } from './components';
import { PartyProvider, ProfileProvider, TextItemProvider } from './context';

const clientConfig = {
  runtime: {
    services: {
      signal: {
        server: 'wss://halo.dxos.org/.well-known/dx/signal'
      }
    }
  }
};

const ClientFallback = () => (
  <div className='py-8 flex flex-col gap-4'>
    <Loading />
    <Heading level={1} className='text-lg font-light text-center'>
      Starting DXOS client…
    </Heading>
  </div>
);

export const App = () => {
  return (
    <ClientProvider config={clientConfig} fallback={<ClientFallback />}>
      <ProfileProvider>
        <PartyProvider>
          <TextItemProvider>
            <Main>
              <Composer />
            </Main>
          </TextItemProvider>
        </PartyProvider>
      </ProfileProvider>
    </ClientProvider>
  );
};
