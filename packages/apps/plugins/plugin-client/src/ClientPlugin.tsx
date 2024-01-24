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
import { Client, ClientContext, type ClientOptions, type SystemStatus } from '@dxos/react-client';
import { type TypeCollection } from '@dxos/react-client/echo';

import { ClientSettings } from './components';
import meta, { CLIENT_PLUGIN } from './meta';
import translations from './translations';

const WAIT_FOR_DEFAULT_SPACE_TIMEOUT = 30_000;

const CLIENT_ACTION = `${CLIENT_PLUGIN}/action`;
export enum ClientAction {
  OPEN_SHELL = `${CLIENT_ACTION}/SHELL`,
  SHARE_IDENTITY = `${CLIENT_ACTION}/SHARE_IDENTITY`,
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
  let error: unknown = null;

  return {
    meta,
    initialize: async () => {
      let firstRun = false;

      client = new Client({ config: new Config(await Envs(), Local(), Defaults()), ...options });

      try {
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
          await client.halo.createIdentity();
          // TODO(wittjosiah): Ideally this would be per app rather than per identity.
          firstRun = true;
        } else if (client.halo.identity.get() && deviceInvitationCode) {
          // Ignore device invitation if identity already exists.
          // TODO(wittjosiah): Identity merging.
          searchParams.delete('deviceInvitationCode');
          window.history.replaceState({}, '', `${location.pathname}?${searchParams}`);
        } else if (deviceInvitationCode) {
          void client.shell.initializeIdentity({ invitationCode: deviceInvitationCode });
        }

        if (client.halo.identity.get()) {
          await client.spaces.isReady.wait({ timeout: WAIT_FOR_DEFAULT_SPACE_TIMEOUT });
          // TODO(wittjosiah): This doesn't work currently.
          //   There's no guaruntee that the default space will be fully synced by the time this is called.
          // firstRun = !client.spaces.default.properties[appKey];
          client.spaces.default.properties[appKey] = true;
        }
      } catch (err) {
        error = err;
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
      };
    },
    ready: async () => {
      if (error) {
        throw error;
      }

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
          }
        },
      },
    },
  };
};
