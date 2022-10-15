//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Config, Defaults, Dynamics } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';
import { Main } from '@dxos/react-ui';

import { Composer, ProviderFallback } from './components';
import { PartyProvider, ProfileProvider, TextItemProvider } from './context';

const configProvider = async () => new Config(await Dynamics(), Defaults());

export const App = () => {
  return (
    <ClientProvider config={configProvider} fallback={<ProviderFallback message='Starting DXOS client…' />}>
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
