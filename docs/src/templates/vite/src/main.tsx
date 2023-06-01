//
// Copyright 2022 DXOS.org
//

import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';

import { setupPeersInSpace } from '@dxos/react-client/testing';

import App from './App';

const main = async () => {
  const { spaceKey, clients } = await setupPeersInSpace({ count: 2 });

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <App spaceKey={spaceKey} clients={clients} />
    </StrictMode>,
  );
};

void main();
