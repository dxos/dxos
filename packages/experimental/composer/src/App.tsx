//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { ClientProvider } from '@dxos/react-client';
import { Heading, Loading, Main } from '@dxos/react-ui';

import { Composer } from './components/Composer';
import { PartyProvider } from './context/PartyProvider';
import { ProfileProvider } from './context/ProfileProvider';
import { TextItemProvider } from './context/TextItemProvider';

const clientConfig = {
  runtime: {
    services: {
      signal: {
        server: 'wss://halo.dxos.org/.well-known/dx/signal'
      },
      ice: [
        { urls: 'stun:demo.kube.dxos.org:3478' },
        {
          urls: 'turn:demo.kube.dxos.org:3478',
          username: 'dxos',
          credential: 'dxos'
        },
        { urls: 'stun:kube.dxos.org:3478' },
        {
          urls: 'turn:kube.dxos.org:3478',
          username: 'dxos',
          credential: 'dxos'
        }
      ]
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
