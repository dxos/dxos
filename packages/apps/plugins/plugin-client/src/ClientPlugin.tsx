//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import {
  resolvePlugin,
  type GraphBuilderProvides,
  type IntentResolverProvides,
  type Plugin,
  type PluginDefinition,
  type SurfaceProvides,
  type TranslationsProvides,
  parseIntentPlugin,
  parseLayoutPlugin,
  parseGraphPlugin,
} from '@dxos/app-framework';
import { Config, Defaults, Envs, Local } from '@dxos/config';
import { registerSignalFactory } from '@dxos/echo-signals/react';
import { LocalStorageStore } from '@dxos/local-storage';
import { Client, ClientContext, PublicKey, type ClientOptions, type SystemStatus } from '@dxos/react-client';
import { type TypeCollection, TypedObject, getSpaceForObject } from '@dxos/react-client/echo';
import { Invitation } from '@dxos/react-client/invitations';

import { ClientSettings } from './components/ClientSettings';
import meta, { CLIENT_PLUGIN } from './meta';
import translations from './translations';

const WAIT_FOR_DEFAULT_SPACE_TIMEOUT = 10_000;

const CLIENT_ACTION = `${CLIENT_PLUGIN}/action`;
export enum ClientAction {
  OPEN_SHELL = `${CLIENT_ACTION}/SHELL`,
  SHARE_IDENTITY = `${CLIENT_ACTION}/SHARE_IDENTITY`,
  SHARE_SPACE = `${CLIENT_ACTION}/SHARE_SPACE`,
  JOIN_SPACE = `${CLIENT_ACTION}/JOIN_SPACE`,
}

export type ClientPluginOptions = ClientOptions & { debugIdentity?: boolean; types?: TypeCollection; appKey: string };

export type ClientSettingsProps = {
  automerge?: boolean;
};

export type ClientPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides & {
    client: Client;
    settings: ClientSettingsProps;

    /**
     * True if this is the first time the current app has been used by this identity.
     */
    firstRun: boolean;
  };

export const parseClientPlugin = (plugin?: Plugin) =>
  (plugin?.provides as any).client instanceof Client ? (plugin as Plugin<ClientPluginProvides>) : undefined;

export const ClientPlugin = ({
  types,
  appKey,
  ...options
}: ClientPluginOptions): PluginDefinition<
  Omit<ClientPluginProvides, 'client' | 'firstRun'>,
  Pick<ClientPluginProvides, 'client' | 'firstRun'>
> => {
  // TODO(burdon): Document.
  registerSignalFactory();

  const settings = new LocalStorageStore<ClientSettingsProps>('dxos.org/settings');
  let client: Client;

  return {
    meta,
    initialize: async () => {
      let error: unknown = null;
      let firstRun = false;

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
        await oldClient.initialize();
        await client.initialize();

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
            void oldClient.destroy();
          } else {
            await client.halo.createIdentity();
            // TODO(wittjosiah): Ideally this would be per app rather than per identity.
            firstRun = true;
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

      if (client.halo.identity.get()) {
        await client.spaces.isReady.wait({ timeout: WAIT_FOR_DEFAULT_SPACE_TIMEOUT });
        // TODO(wittjosiah): This doesn't work currently.
        //   There's no guaruntee that the default space will be fully synced by the time this is called.
        // firstRun = !client.spaces.default.properties[appKey];
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
    ready: async () => {
      settings.prop(settings.values.$automerge!, 'automerge', LocalStorageStore.bool);
    },
    unload: async () => {
      await client.destroy();
    },
    provides: {
      settings: settings.values,
      translations,
      surface: {
        component: ({ data, role }) => {
          const { component } = data;
          if (role === 'settings' && component === 'dxos.org/plugin/layout/ProfileSettings') {
            return <ClientSettings />;
          }
          return null;
        },
      },
      graph: {
        builder: ({ parent, plugins }) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
          const layoutPlugin = resolvePlugin(plugins, parseLayoutPlugin);
          // TODO(wittjosiah): Pass graph to builders?
          const graphPlugin = resolvePlugin(plugins, parseGraphPlugin);

          if (parent.id === 'root') {
            parent.addAction(
              {
                id: `${CLIENT_PLUGIN}/open-shell`,
                label: ['open shell label', { ns: CLIENT_PLUGIN }],
                invoke: () =>
                  intentPlugin?.provides.intent.dispatch([{ plugin: CLIENT_PLUGIN, action: ClientAction.OPEN_SHELL }]),
                properties: {
                  testId: 'clientPlugin.openShell',
                },
                keyBinding: 'meta+shift+.',
              },
              // TODO(wittjosiah): This action is likely unnecessary once keybindings can be context aware.
              //   Each space has its own version of this action.
              {
                id: `${CLIENT_PLUGIN}/share-space`,
                label: ['share space label', { ns: CLIENT_PLUGIN }],
                invoke: () => {
                  const active = layoutPlugin?.provides.layout.active;
                  const graph = graphPlugin?.provides.graph;
                  if (!active || !graph) {
                    return;
                  }

                  const node = graph.findNode(active);
                  if (!node || !(node.data instanceof TypedObject)) {
                    return;
                  }

                  const space = getSpaceForObject(node.data);
                  return intentPlugin?.provides.intent.dispatch([
                    { plugin: CLIENT_PLUGIN, action: ClientAction.SHARE_SPACE, data: { spaceKey: space?.key } },
                  ]);
                },
                properties: {
                  testId: 'clientPlugin.shareSpace',
                },
                keyBinding: 'meta+.',
              },
            );
          }
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case ClientAction.OPEN_SHELL:
              return client.shell.open(intent.data?.layout);

            case ClientAction.SHARE_IDENTITY:
              return client.shell.shareIdentity();

            case ClientAction.SHARE_SPACE:
              return intent.data?.spaceKey instanceof PublicKey &&
                !intent.data?.spaceKey.equals(client.spaces.default.key)
                ? client.shell.shareSpace({ spaceKey: intent.data.spaceKey })
                : false;

            case ClientAction.JOIN_SPACE:
              return typeof intent.data?.invitationCode === 'string'
                ? client.shell.joinSpace({ invitationCode: intent.data.invitationCode })
                : false;
          }
        },
      },
    },
  };
};
