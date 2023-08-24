//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Config, Defaults, Envs, Local } from '@dxos/config';
import { registerSignalFactory } from '@dxos/echo-signals/react';
import {
  Client,
  ClientContext,
  ClientOptions,
  IFrameClientServicesHost,
  IFrameClientServicesProxy,
  SystemStatus,
} from '@dxos/react-client';
import { PluginDefinition } from '@dxos/react-surface';

import { ClientPluginProvides } from './types';

const handleInvalidatedInvitationCode = (code: string) => {
  const url = new URL(location.href);
  const params = Array.from(url.searchParams.entries());
  const [name] = params.find(([name, value]) => value === code) ?? [null, null];
  if (name) {
    url.searchParams.delete(name);
    history.replaceState({}, document.title, url.href);
  }
};

export const ClientPlugin = (
  options: ClientOptions = { config: new Config(Envs(), Local(), Defaults()) },
): PluginDefinition<{}, ClientPluginProvides> => {
  registerSignalFactory();
  const client = new Client(options);

  return {
    meta: {
      id: 'dxos.org/plugin/client',
    },
    init: async () => {
      await client.initialize();
      if (!client.halo.identity.get()) {
        await client.halo.createIdentity();
      }

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

            if (
              client.services instanceof IFrameClientServicesProxy ||
              client.services instanceof IFrameClientServicesHost
            ) {
              client.services.invalidatedInvitationCode.on(handleInvalidatedInvitationCode);
            }

            return () => {
              subscription.unsubscribe();
              if (
                client.services instanceof IFrameClientServicesProxy ||
                client.services instanceof IFrameClientServicesHost
              ) {
                client.services.invalidatedInvitationCode.off(handleInvalidatedInvitationCode);
              }
            };
          }, [client, setStatus]);

          return <ClientContext.Provider value={{ client, status }}>{children}</ClientContext.Provider>;
        },
      };
    },
    unload: async () => {
      await client.destroy();
    },
  };
};
