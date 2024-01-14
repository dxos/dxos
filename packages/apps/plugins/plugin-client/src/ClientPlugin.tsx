//
// Copyright 2023 DXOS.org
//

import { AddressBook } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import {
  parseIntentPlugin,
  resolvePlugin,
  type GraphBuilderProvides,
  type IntentResolverProvides,
  type Plugin,
  type PluginDefinition,
  type SettingsProvides,
  type SurfaceProvides,
  type TranslationsProvides,
} from '@dxos/app-framework';
import { Config, Defaults, Envs, Local } from '@dxos/config';
import { registerSignalFactory } from '@dxos/echo-signals/react';
import { LocalStorageStore } from '@dxos/local-storage';
import { log } from '@dxos/log';
import {
  Client,
  ClientContext,
  PublicKey,
  type ClientOptions,
  type SystemStatus,
  fromIFrame,
} from '@dxos/react-client';
import { type TypeCollection } from '@dxos/react-client/echo';
import { Invitation } from '@dxos/react-client/invitations';

import { ClientSettings } from './components';
import meta, { CLIENT_PLUGIN } from './meta';
import translations from './translations';

const WAIT_FOR_DEFAULT_SPACE_TIMEOUT = 30_000;

const CLIENT_ACTION = `${CLIENT_PLUGIN}/action`;
export enum ClientAction {
  OPEN_SHELL = `${CLIENT_ACTION}/SHELL`,
  SHARE_IDENTITY = `${CLIENT_ACTION}/SHARE_IDENTITY`,
  // TODO(burdon): Reconcile with SpacePlugin.
  JOIN_SPACE = `${CLIENT_ACTION}/JOIN_SPACE`,
  SHARE_SPACE = `${CLIENT_ACTION}/SHARE_SPACE`,
}

export type ClientPluginOptions = ClientOptions & { appKey: string; debugIdentity?: boolean; types?: TypeCollection };

export type ClientSettingsProps = {
  automerge?: boolean;
};

export type ClientPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  SettingsProvides<ClientSettingsProps> &
  TranslationsProvides & {
    client: Client;

    /**
     * True if this is the first time the current app has been used by this identity.
     */
    firstRun: boolean;
  };

export const parseClientPlugin = (plugin?: Plugin) =>
  (plugin?.provides as any).client instanceof Client ? (plugin as Plugin<ClientPluginProvides>) : undefined;

const ENABLE_VAULT_MIGRATION = !location.host.startsWith('localhost');

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

  const settings = new LocalStorageStore<ClientSettingsProps>('dxos.org/settings', { automerge: true });

  let client: Client;

  return {
    meta,
    initialize: async () => {
      let error: unknown = null;
      let firstRun = false;

      client = new Client({ config: new Config(await Envs(), Local(), Defaults()), ...options });
      let oldClient: Client = null as any;

      if (ENABLE_VAULT_MIGRATION) {
        const oldConfig = new Config(
          {
            runtime: {
              client: {
                remoteSource:
                  location.host === 'composer.staging.dxos.org'
                    ? 'https://halo.staging.dxos.org/vault.html'
                    : location.host === 'composer.dev.dxos.org'
                    ? 'https://halo.dev.dxos.org/vault.html'
                    : 'https://halo.dxos.org/vault.html',
              },
            },
          },
          await Envs(),
          Defaults(),
        );

        oldClient = new Client({
          config: oldConfig,
          services: fromIFrame(oldConfig, { shell: false }),
        });
      }

      try {
        if (ENABLE_VAULT_MIGRATION) {
          await oldClient.initialize();
        }
        await client.initialize();

        // TODO(wittjosiah): Remove. This is a hack to get the app to boot with the new identity after a reset.
        client.reloaded.on(() => {
          client.halo.identity.subscribe(async (identity) => {
            if (identity) {
              window.location.href = window.location.origin;
            }
          });
        });

        if (types) {
          client.addTypes(types);
        }

        // TODO(burdon): Factor out invitation logic since depends on path routing?
        const searchParams = new URLSearchParams(location.search);
        const deviceInvitationCode = searchParams.get('deviceInvitationCode');
        const identity = client.halo.identity.get();
        if (!identity && !deviceInvitationCode) {
          // TODO(wittjosiah): Remove.
          const oldIdentity = ENABLE_VAULT_MIGRATION && oldClient.halo.identity.get();
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
          } else if (!client.halo.identity.get()) {
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
        log.catch(err);
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
          switch (role) {
            case 'settings':
              return data.plugin === meta.id ? <ClientSettings settings={settings.values} /> : null;
          }

          return null;
        },
      },
      graph: {
        builder: ({ parent, plugins }) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          if (parent.id === 'root') {
            parent.addAction({
              id: `${CLIENT_PLUGIN}/open-shell`,
              label: ['open shell label', { ns: CLIENT_PLUGIN }],
              icon: (props) => <AddressBook {...props} />,
              keyBinding: 'meta+shift+.',
              invoke: () =>
                intentPlugin?.provides.intent.dispatch([{ plugin: CLIENT_PLUGIN, action: ClientAction.OPEN_SHELL }]),
              properties: {
                testId: 'clientPlugin.openShell',
              },
            });
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

            // TODO(burdon): Remove (use SpacePlugin).
            case ClientAction.JOIN_SPACE:
              return typeof intent.data?.invitationCode === 'string'
                ? client.shell.joinSpace({ invitationCode: intent.data.invitationCode })
                : false;

            // TODO(burdon): Remove (use SpacePlugin).
            case ClientAction.SHARE_SPACE:
              return intent.data?.spaceKey instanceof PublicKey &&
                !intent.data?.spaceKey.equals(client.spaces.default.key)
                ? client.shell.shareSpace({ spaceKey: intent.data.spaceKey })
                : false;
          }
        },
      },
    },
  };
};
