//
// Copyright 2023 DXOS.org
//

import React from 'react';

import {
  Client,
  ClientProvider,
  Config,
  IFrameClientServicesHost,
  IFrameClientServicesProxy,
  ShellController,
} from '@dxos/react-client';

import { definePlugin } from '../framework';

export type ClientPluginProvides = {
  client: Client;
  setLayout: ShellController['setLayout'];
};

export const ClientPlugin = definePlugin<{}, ClientPluginProvides>({
  meta: {
    id: 'dxos:ClientPlugin',
  },
  init: async () => {
    const client = new Client({
      config: new Config({ runtime: { client: { remoteSource: 'https://halo.dev.dxos.org/vault.html' } } }),
    });
    await client.initialize();

    return {
      client,
      setLayout: async (layout, options) => {
        if (
          client.services instanceof IFrameClientServicesProxy ||
          client.services instanceof IFrameClientServicesHost
        ) {
          await client.services.setLayout(layout, options);
        }
      },
      context: ({ children }) => <ClientProvider client={client}>{children}</ClientProvider>,
    };
  },
});
