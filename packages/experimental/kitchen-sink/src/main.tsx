//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { ClientProvider } from '@dxos/react-client';
import { ProfileInitializer, useTestSpace } from '@dxos/react-client-testing';

import { App } from './components';

const Main = () => {
  const space = useTestSpace();
  if (!space) {
    return null;
  }

  return <App space={space} />;
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
