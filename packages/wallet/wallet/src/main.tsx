//
// Copyright 2020 DXOS.org
//

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

import { Config, Defaults, Dynamics } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';

import { App } from './App';
import { ActionProvider } from './containers';

const root = createRoot(document.getElementById('root') as HTMLElement);
const configProvider = async () => new Config(await Dynamics(), Defaults());

root.render(
  <StrictMode>
    <ClientProvider config={configProvider}>
      <ActionProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </ActionProvider>
    </ClientProvider>
  </StrictMode>
);
