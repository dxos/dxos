//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import type { Plugin, PluginDefinition } from '@dxos/app-framework';
import { type TypeCollection } from '@dxos/client/echo';
import { Invitation, InvitationEncoder } from '@dxos/client/invitations';
import { Config, Defaults, Envs, Local } from '@dxos/config';
import { registerSignalFactory } from '@dxos/echo-signals/react';
import { log } from '@dxos/log';
import { Client, ClientContext, type ClientOptions, type SystemStatus } from '@dxos/react-client';

import meta from './meta';

const WAIT_FOR_DEFAULT_SPACE_TIMEOUT = 10_000;

export type ClientPluginOptions = ClientOptions & { debugIdentity?: boolean; types?: TypeCollection; appKey: string };

export type ClientPluginProvides = {
  client: Client;

  /**
   * True if this is the first time the current app has been used by this identity.
   */
  firstRun: boolean;
};

export const parseClientPlugin = (plugin?: Plugin) =>
  (plugin?.provides as any).client instanceof Client ? (plugin as Plugin<ClientPluginProvides>) : undefined;

export const ClientPlugin = ({
  debugIdentity,
  types,
  appKey,
  ...options
}: ClientPluginOptions): PluginDefinition<{}, ClientPluginProvides> => {
  let client: Client;

  // TODO(burdon): Document.
  registerSignalFactory();

  return {
    meta,
    initialize: async () => {
      let error: unknown = null;

      client = new Client({ config: new Config(await Envs(), Local(), Defaults()), ...options });

      const oldClient = new Client({
        config: new Config(
          {
            runtime: {
              client: {
                remoteSource: 'https://halo.dxos.org/vault.html',
              },
            },
          },
          await Envs(),
          Defaults(),
        ),
      });

      try {
        await client.initialize();
        await oldClient.initialize();

        console.log({ client, oldClient });

        if (types) {
          client.addTypes(types);
        }

        // TODO(burdon): Factor out invitation logic since depends on path routing?
        const searchParams = new URLSearchParams(location.search);
        const deviceInvitationCode = searchParams.get('deviceInvitationCode');
        const identity = client.halo.identity.get();
        if (!identity && !deviceInvitationCode) {
          // TODO(wittjosiah): Remove.
          const oldIdentity = oldClient.halo.identity.get();
          if (oldIdentity) {
            alert(
              'Composer must perform some database maintenance to upgrade your identity to the latest version. After continuing, please keep this window open until the app loads.',
            );
            const oldObs = oldClient.halo.share();
            const newObs = client.halo.join(oldObs.get());

            oldObs.subscribe(async (invitation) => {
              switch (invitation.state) {
                case Invitation.State.READY_FOR_AUTHENTICATION: {
                  await newObs.authenticate(invitation.authCode!);
                }
              }
            });

            await newObs.wait();
          } else {
            await client.halo.createIdentity();
          }
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
      if (debugIdentity) {
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

      let firstRun = false;
      if (client.halo.identity.get()) {
        await client.spaces.isReady.wait({ timeout: WAIT_FOR_DEFAULT_SPACE_TIMEOUT });
        firstRun = !client.spaces.default.properties[appKey];
        client.spaces.default.properties[appKey] = true;
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
        root: () => {
          if (error) {
            throw error;
          }

          return null;
        },
      };
    },
    unload: async () => {
      await client.destroy();
    },
  };
};
