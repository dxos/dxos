//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { InvitationEncoder } from '@dxos/client/invitations';
import { Config, Defaults, Envs, Local } from '@dxos/config';
import { registerSignalFactory } from '@dxos/echo-signals/react';
import { log } from '@dxos/log';
import {
  Client,
  ClientContext,
  ClientOptions,
  IFrameClientServicesHost,
  IFrameClientServicesProxy,
  SystemStatus,
} from '@dxos/react-client';
import { PluginDefinition } from '@dxos/react-surface';

import { CLIENT_PLUGIN, ClientPluginProvides } from './types';

const handleInvalidatedInvitationCode = (code: string) => {
  const url = new URL(location.href);
  const params = Array.from(url.searchParams.entries());
  const [name] = params.find(([name, value]) => value === code) ?? [null, null];
  if (name) {
    url.searchParams.delete(name);
    history.replaceState({}, document.title, url.href);
  }
};

export type ClientPluginOptions = ClientOptions & { debugIdentity?: boolean };

export const ClientPlugin = (
  options: ClientPluginOptions = { config: new Config(Envs(), Local(), Defaults()) },
): PluginDefinition<{}, ClientPluginProvides> => {
  registerSignalFactory();
  const client = new Client(options);

  // Open devtools on keypress
  const onKeypress = async (e: KeyboardEvent) => {
    // Cmd + Shift + X
    if (e.metaKey && e.shiftKey && e.key === 'x') {
      e.preventDefault();

      const vault = options.config?.values.runtime?.client?.remoteSource ?? 'https://halo.dxos.org';

      // Check if we're serving devtools locally on the usual port.
      let hasLocalDevtools = false;
      try {
        await fetch('http://localhost:5174/');
        hasLocalDevtools = true;
      } catch {}

      const isDev = window.location.href.includes('.dev.') || window.location.href.includes('localhost');
      const devtoolsApp = hasLocalDevtools
        ? 'http://localhost:5174/'
        : `https://devtools${isDev ? '.dev.' : '.'}dxos.org/`;
      const devtoolsUrl = `${devtoolsApp}?target=${vault}`;
      window.open(devtoolsUrl, '_blank');
    }
  };

  return {
    meta: {
      id: CLIENT_PLUGIN,
    },
    initialize: async () => {
      let firstRun = false;

      document.addEventListener('keydown', onKeypress);

      await client.initialize();
      const searchParams = new URLSearchParams(location.search);
      if (!client.halo.identity.get() && !searchParams.has('deviceInvitationCode')) {
        firstRun = true;
        await client.halo.createIdentity();
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
            const observer = client.acceptInvitation(InvitationEncoder.decode(spaceInvitationCode));
            observer.subscribe(({ state }) => {
              log.info('invitation', { state });
            });
          }, 2000);
        }
      }

      return {
        client,
        firstRun,
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
      document.removeEventListener('keydown', onKeypress);

      await client.destroy();
    },
  };
};
