//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import type { Plugin, PluginDefinition } from '@dxos/app-framework';
import { type TypeCollection } from '@dxos/client/echo';
import { InvitationEncoder } from '@dxos/client/invitations';
import { Config, Defaults, Envs, Local } from '@dxos/config';
import { registerSignalFactory } from '@dxos/echo-signals/react';
import { log } from '@dxos/log';
import { Client, ClientContext, type ClientOptions, type SystemStatus } from '@dxos/react-client';

import { type ClientPluginProvides, CLIENT_PLUGIN } from './types';

export type ClientPluginOptions = ClientOptions & { debugIdentity?: boolean; types?: TypeCollection };

export const parseClientPlugin = (plugin?: Plugin) =>
  (plugin?.provides as any).client instanceof Client ? (plugin as Plugin<ClientPluginProvides>) : undefined;

export const ClientPlugin = (
  options: ClientPluginOptions = { config: new Config(Envs(), Local(), Defaults()) },
): PluginDefinition<{}, ClientPluginProvides> => {
  // TODO(burdon): Document.
  registerSignalFactory();

  const client = new Client(options);

  return {
    meta: {
      id: CLIENT_PLUGIN,
    },
    initialize: async () => {
      let firstRun = false;
      let error: unknown = null;

      try {
        await client.initialize();

        if (options.types) {
          client.addTypes(options.types);
        }

        // TODO(burdon): Factor out invitation logic since depends on path routing?
        const searchParams = new URLSearchParams(location.search);
        const deviceInvitationCode = searchParams.get('deviceInvitationCode');
        if (!client.halo.identity.get() && !deviceInvitationCode) {
          firstRun = true;
          await client.halo.createIdentity();
        } else if (client.halo.identity.get() && deviceInvitationCode) {
          // Ignore device invitation if identity already exists.
          // TODO(wittjosiah): Identity merging.
          searchParams.delete('deviceInvitationCode');
          window.history.replaceState({}, '', `${location.pathname}?${searchParams}`);
        } else if (deviceInvitationCode) {
          void client.shell.initializeIdentity({ invitationCode: deviceInvitationCode });
        }
      } catch (err) {
        error = err;
      }

      // Debugging (e.g., for monolithic mode).
      if (options.debugIdentity) {
        if (!client.halo.identity.get()) {
          await client.halo.createIdentity();
        }

        // Handle initial connection (assumes no PIN).
        const searchParams = new URLSearchParams(window.location.search);
        const spaceInvitationCode = searchParams.get('spaceInvitationCode');
        if (spaceInvitationCode) {
          setTimeout(() => {
            // TODO(burdon): Unsubscribe.
            const observer = client.spaces.join(InvitationEncoder.decode(spaceInvitationCode));
            observer.subscribe(({ state }) => {
              log.info('invitation', { state });
            });
          }, 2000);
        }
      }

      // TODO(burdon): Timeout.
      if (client.halo.identity.get()) {
        await client.spaces.isReady.wait();
      }

      return {
        client,
        firstRun,
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
        components: {
          default: () => {
            if (error) {
              throw error;
            }

            return null;
          },
        },
      };
    },
    unload: async () => {
      await client.destroy();
    },
  };
};
