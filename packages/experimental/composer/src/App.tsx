//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { ClientProvider } from '@dxos/react-client';
import { Main } from '@dxos/react-ui';

import { Composer } from './components/Composer';
import { PartyProvider } from './components/PartyProvider';
import { ProfileProvider } from './components/ProfileProvider';
import { TextItemProvider } from './components/TextItemProvider';

export const App = () => {
  return (
    <ClientProvider>
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
