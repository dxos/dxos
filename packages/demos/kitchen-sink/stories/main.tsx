//
// Copyright 2020 DXOS.org
//

import React from 'react';
import ReactDOM from 'react-dom';

import { ClientProvider, ProfileInitializer } from '@dxos/react-client';

// TODO(burdon): Move to src/demo.
import { App, useTestParty } from './helpers';

const Main = () => {
  const party = useTestParty();
  if (!party) {
    return null;
  }

  return (
    <App party={party} />
  );
}

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
