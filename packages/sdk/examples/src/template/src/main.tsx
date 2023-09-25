//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import React from 'react';
import ReactDOM from 'react-dom/client';

import { setupPeersInSpace } from '@dxos/react-client/testing';

import App from './App';

const main = async () => {
  const { spaceKey, clients } = await setupPeersInSpace({ count: 2 });

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <App spaceKey={spaceKey} clients={clients} />,
  );
};

void main();
