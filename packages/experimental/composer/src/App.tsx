//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { ClientProvider } from '@dxos/react-client';
import { Main } from '@dxos/react-ui';

import { Composer } from './components/Composer';
import { PartyProvider } from './context/PartyProvider';
import { ProfileProvider } from './context/ProfileProvider';
import { TextItemProvider } from './context/TextItemProvider';

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
