//
// Copyright 2020 DXOS.org
//

import React from 'react';
import ReactDOM from 'react-dom';

import { ClientProvider } from '@dxos/react-client';
import { ProfileInitializer, useTestParty } from '@dxos/react-client-testing';

// TODO(burdon): Move to src/demo.
import { App } from './helpers';

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
