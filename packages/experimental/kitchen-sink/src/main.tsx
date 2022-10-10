//
// Copyright 2020 DXOS.org
//

import React from 'react';
import ReactDOM from 'react-dom';

import { ClientProvider } from '@dxos/react-client';
import { ProfileInitializer, useTestParty } from '@dxos/react-client-testing';

import { App } from './components/index.js';

const Main = () => {
  const party = useTestParty();
  if (!party) {
    return null;
  }

  return (
    <App party={party} />
  );
};

const start = () => {
  ReactDOM.render(
    <ClientProvider>
      <ProfileInitializer>
        <Main />
      </ProfileInitializer>
    </ClientProvider>,
    document.getElementById('root')
  );
};

start();
