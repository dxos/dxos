//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { MulticastObservable } from '@dxos/async';
import { Client, ClientProvider } from '@dxos/react-client';

import { definePlugin } from '../framework';
import { GraphPluginProvides } from './ListViewPlugin';

export type ClientPluginProvides = GraphPluginProvides & {
  client: Client;
};

export const ClientPlugin = definePlugin<{}, ClientPluginProvides>({
  meta: {
    id: 'dxos:ClientPlugin'
  },
  init: async () => {
    const client = new Client();
    await client.initialize();

    return {
      client,
      context: ({ children }) => <ClientProvider client={client}>{children}</ClientProvider>,
      graph: {
        actions: (_, parent) => {
          if (parent) {
            return MulticastObservable.of([]);
          }
          // TODO(wittjosiah): This is probably not a graph node action, just to expose it in the story for the moment.
          return MulticastObservable.of([
            {
              id: 'dxos:CreateIdentity',
              label: 'Create identity',
              invoke: async () => {
                const identity = await client.halo.createIdentity();
                console.log(identity);
              }
            }
          ]);
        }
      }
    };
  }
});
