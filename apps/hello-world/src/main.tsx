//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { createRoot } from 'react-dom/client';

import { Config, Defaults, Dynamics } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';

import { App } from './App';

const root = createRoot(document.getElementById('root') as HTMLElement);
const configProvider = async () => new Config(await Dynamics(), Defaults());

(() => {
  root.render(
    <ClientProvider config={configProvider}>
      <App />
    </ClientProvider>
  );
})();
