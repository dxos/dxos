//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Config, Defaults, Envs, Local } from '@dxos/config';
import {
  Client,
  ClientContext,
  IFrameClientServicesHost,
  IFrameClientServicesProxy,
  ShellController,
  SystemStatus,
} from '@dxos/react-client';
import { definePlugin } from '@dxos/react-surface';

export type ClientPluginProvides = {
  client: Client;
  setLayout: ShellController['setLayout'];
};

const client = new Client({ config: new Config(Envs(), Local(), Defaults()) });

export const ClientPlugin = definePlugin<{}, ClientPluginProvides>({
  meta: {
    id: 'dxos:ClientPlugin',
  },
  init: async () => {
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
      context: ({ children }) => {
        const [status, setStatus] = useState<SystemStatus | null>(null);

        useEffect(() => {
          if (!client) {
            return;
          }

          const subscription = client.status.subscribe((status) => setStatus(status));
          return () => subscription.unsubscribe();
        }, [client, setStatus]);

        return <ClientContext.Provider value={{ client, status }}>{children}</ClientContext.Provider>;
      },
    };
  },
  unload: async () => {
    await client.destroy();
  },
});
