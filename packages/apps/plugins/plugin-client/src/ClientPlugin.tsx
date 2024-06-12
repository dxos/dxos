//
// Copyright 2023 DXOS.org
//

import { AddressBook, type IconProps } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { TextV0Type } from '@braneframe/types';
import {
  parseIntentPlugin,
  resolvePlugin,
  type GraphBuilderProvides,
  type IntentResolverProvides,
  type Plugin,
  type PluginDefinition,
  type TranslationsProvides,
  filterPlugins,
} from '@dxos/app-framework';
import { Config, Defaults, Envs, Local, Storage } from '@dxos/config';
import { registerSignalRuntime } from '@dxos/echo-signals/react';
import { Client, ClientContext, type ClientOptions, type SystemStatus } from '@dxos/react-client';

import meta, { CLIENT_PLUGIN } from './meta';
import translations from './translations';

const WAIT_FOR_DEFAULT_SPACE_TIMEOUT = 30_000;

const CLIENT_ACTION = `${CLIENT_PLUGIN}/action`;
export enum ClientAction {
  OPEN_SHELL = `${CLIENT_ACTION}/SHELL`,
  SHARE_IDENTITY = `${CLIENT_ACTION}/SHARE_IDENTITY`,
}

export type ClientPluginOptions = ClientOptions & {
  /**
   * Used to track app-specific state in spaces.
   */
  appKey: string;

  /**
   * Query string parameter to look for device invitation codes.
   */
  deviceInvitationParam?: string;

  /**
   * Run after the client has been initialized.
   */
  onClientInitialized?: (client: Client) => Promise<void>;
};

export type ClientPluginProvides = IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides & {
    client: Client;

    /**
     * True if this is the first time the current app has been used by this identity.
     */
    firstRun: boolean;
  };

export const parseClientPlugin = (plugin?: Plugin) =>
  (plugin?.provides as any).client instanceof Client ? (plugin as Plugin<ClientPluginProvides>) : undefined;

export type SchemaProvides = {
  echo: {
    schema: Parameters<Client['addSchema']>;
  };
};

export const parseSchemaPlugin = (plugin?: Plugin) =>
  Array.isArray((plugin?.provides as any).echo?.schema) ? (plugin as Plugin<SchemaProvides>) : undefined;

export const ClientPlugin = ({
  appKey,
  deviceInvitationParam = 'deviceInvitationCode',
  onClientInitialized,
  ...options
}: ClientPluginOptions): PluginDefinition<
  Omit<ClientPluginProvides, 'client' | 'firstRun'>,
  Pick<ClientPluginProvides, 'client' | 'firstRun'>
> => {
  registerSignalRuntime();

  let client: Client;
  let error: unknown = null;

  return {
    meta,
    initialize: async () => {
      let firstRun = false;

      const config = new Config(await Storage(), Envs(), Local(), Defaults());
      client = new Client({ config, ...options });

      try {
        await client.initialize();
        // TODO(wittjosiah): Why is this here? Remove?
        client.addSchema(TextV0Type);
        await onClientInitialized?.(client);

        // TODO(wittjosiah): Remove. This is a hack to get the app to boot with the new identity after a reset.
        client.reloaded.on(() => {
          client.halo.identity.subscribe(async (identity) => {
            if (identity) {
              window.location.href = window.location.origin;
            }
          });
        });

        // TODO(burdon): Factor out invitation logic since depends on path routing?
        const searchParams = new URLSearchParams(location.search);
        const deviceInvitationCode = searchParams.get(deviceInvitationParam);
        const identity = client.halo.identity.get();
        if (!identity && !deviceInvitationCode) {
          await client.halo.createIdentity();
          // TODO(wittjosiah): Ideally this would be per app rather than per identity.
          firstRun = true;
        } else if (deviceInvitationCode) {
          await client.shell.initializeIdentity({ invitationCode: deviceInvitationCode }).then(({ identity }) => {
            if (!identity) {
              return;
            }

            const url = new URL(window.location.href);
            const params = Array.from(url.searchParams.entries());
            const [name] = params.find(([_, value]) => value === deviceInvitationCode) ?? [null, null];
            if (name) {
              url.searchParams.delete(name);
              history.replaceState({}, document.title, url.href);
            }
          });
        }

        if (client.halo.identity.get()) {
          await client.spaces.isReady.wait({ timeout: WAIT_FOR_DEFAULT_SPACE_TIMEOUT });
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
    ready: async (plugins) => {
      if (error) {
        throw error;
      }

      filterPlugins(plugins, parseSchemaPlugin).forEach((plugin) => {
        client.addSchema(...plugin.provides.echo.schema);
      });
    },
    unload: async () => {
      await client.destroy();
    },
    provides: {
      translations,
      graph: {
        builder: (plugins, graph) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
          const id = `${CLIENT_PLUGIN}/open-shell`;
          graph.addNodes({
            id,
            data: () =>
              intentPlugin?.provides.intent.dispatch([{ plugin: CLIENT_PLUGIN, action: ClientAction.OPEN_SHELL }]),
            properties: {
              label: ['open shell label', { ns: CLIENT_PLUGIN }],
              icon: (props: IconProps) => <AddressBook {...props} />,
              keyBinding: {
                macos: 'meta+shift+.',
                // TODO(wittjosiah): Test on windows to see if it behaves the same as linux.
                windows: 'alt+shift+.',
                linux: 'alt+shift+>',
              },
              testId: 'clientPlugin.openShell',
            },
            edges: [['root', 'inbound']],
          });
        },
      },
      intent: {
        resolver: async (intent) => {
          switch (intent.action) {
            case ClientAction.OPEN_SHELL:
              await client.shell.open(intent.data?.layout);
              return { data: true };

            case ClientAction.SHARE_IDENTITY: {
              const data = await client.shell.shareIdentity();
              return { data };
            }
          }
        },
      },
    },
  };
};
