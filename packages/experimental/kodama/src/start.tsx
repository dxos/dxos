//
// Copyright 2022 DXOS.org
//

import { render } from 'ink';
import React from 'react';

import { Client } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';

import { App } from './components/index.js';
import { AppStateProvider } from './hooks/index.js';

export interface Options {
  debug?: boolean
  update?: {
    name: string
    version: string
  }
}

export const start = async (client: Client, options: Options = {}) => {
  const { debug } = options;

  const { waitUntilExit } = render((
    <ClientProvider client={client}>
      <AppStateProvider debug={debug}>
        <App />
      </AppStateProvider>
    </ClientProvider>
  ));

  await waitUntilExit();
};
