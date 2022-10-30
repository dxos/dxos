//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { ClientProvider } from '@dxos/react-client';
import { ProfileInitializer, useTestParty } from '@dxos/react-client-testing';

import { App } from './components';

const Main = () => {
  const party = useTestParty();
  if (!party) {
    return null;
  }

  return <App party={party} />;
};

const start = () => {
  createRoot(document.getElementById('root')!).render(
    <ClientProvider>
      <ProfileInitializer>
        <Main />
      </ProfileInitializer>
    </ClientProvider>
  );
};

start();
