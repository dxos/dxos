//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { ClientProvider } from '@dxos/react-client';
import { Main } from '@dxos/react-ui';

import { Composer, ProviderFallback } from './components';
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

export const App = () => {
  return (
    <ClientProvider config={clientConfig} fallback={<ProviderFallback message='Starting DXOS client…' />}>
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
