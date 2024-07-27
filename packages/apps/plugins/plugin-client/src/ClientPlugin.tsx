//
// Copyright 2023 DXOS.org
//

import { AddressBook, type IconProps } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { createExtension, type Node } from '@braneframe/plugin-graph';
import {
  filterPlugins,
  parseIntentPlugin,
  resolvePlugin,
  type GraphBuilderProvides,
  type IntentResolverProvides,
  type Plugin,
  type PluginDefinition,
  type TranslationsProvides,
} from '@dxos/app-framework';
import { Config, Defaults, Envs, Local, Storage } from '@dxos/config';
import { type S } from '@dxos/echo-schema';
import { registerSignalRuntime } from '@dxos/echo-signals/react';
import { log } from '@dxos/log';
import { Client, ClientContext, type ClientOptions, type SystemStatus } from '@dxos/react-client';

import meta, { CLIENT_PLUGIN, ClientAction } from './meta';
import translations from './translations';

export type ClientPluginOptions = ClientOptions & {
  /**
   * Used to track app-specific state in spaces.
   */
  appKey: string;

  /**
   * Run after the client has been initialized.
   */
  onClientInitialized?: (client: Client) => Promise<void>;

  /**
   * Run after the identity has been successfully initialized.
   * Run with client during plugin ready phase.
   */
  onReady?: (client: Client, plugins: Plugin[]) => Promise<void>;
};

export type ClientPluginProvides = IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides & {
    client: Client;
  };

export const parseClientPlugin = (plugin?: Plugin) =>
  (plugin?.provides as any).client instanceof Client ? (plugin as Plugin<ClientPluginProvides>) : undefined;

export type SchemaProvides = {
  echo: {
    schema: S.Schema<any>[];
  };
};

export const parseSchemaPlugin = (plugin?: Plugin) =>
  Array.isArray((plugin?.provides as any).echo?.schema) ? (plugin as Plugin<SchemaProvides>) : undefined;

export const ClientPlugin = ({
  appKey,
  onClientInitialized,
  onReady,
  ...options
}: ClientPluginOptions): PluginDefinition<
  Omit<ClientPluginProvides, 'client'>,
  Pick<ClientPluginProvides, 'client'>
> => {
  registerSignalRuntime();

  let client: Client;
  let error: unknown = null;

  return {
    meta,
    initialize: async () => {
      const config = new Config(await Storage(), Envs(), Local(), Defaults());
      client = new Client({ config, ...options });

      try {
        await client.initialize();
        await onClientInitialized?.(client);

        // TODO(wittjosiah): Remove. This is a hack to get the app to boot with the new identity after a reset.
        client.reloaded.on(() => {
          client.halo.identity.subscribe(async (identity) => {
            if (identity) {
              window.location.href = window.location.origin;
            }
          });
        });
      } catch (err) {
        error = err;
      }

      return {
        client,
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

      await onReady?.(client, plugins);

      filterPlugins(plugins, parseSchemaPlugin).forEach((plugin) => {
        log('ready', { id: plugin.meta.id });
        client.addTypes(plugin.provides.echo.schema);
      });
    },
    unload: async () => {
      await client.destroy();
    },
    provides: {
      translations,
      graph: {
        builder: (plugins) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
          const id = `${CLIENT_PLUGIN}/open-shell`;

          return createExtension({
            id: CLIENT_PLUGIN,
            filter: (node): node is Node<null> => node.id === 'root',
            actions: () => [
              {
                id,
                data: async () => {
                  await intentPlugin?.provides.intent.dispatch([
                    { plugin: CLIENT_PLUGIN, action: ClientAction.OPEN_SHELL },
                  ]);
                },
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
              },
            ],
          });
        },
      },
      intent: {
        resolver: async (intent) => {
          switch (intent.action) {
            case ClientAction.OPEN_SHELL:
              await client.shell.open(intent.data?.layout);
              return { data: true };

            case ClientAction.CREATE_IDENTITY: {
              const data = await client.halo.createIdentity();
              return {
                data,
                intents: [
                  [
                    {
                      // NOTE: This action is hardcoded to avoid circular dependency with observability plugin.
                      action: 'dxos.org/plugin/observability/send-event',
                      data: {
                        name: 'identity.created',
                      },
                    },
                  ],
                ],
              };
            }

            case ClientAction.JOIN_IDENTITY: {
              const data = await client.shell.joinIdentity({ invitationCode: intent.data?.invitationCode });
              return {
                data,
                intents: [
                  [
                    {
                      // NOTE: This action is hardcoded to avoid circular dependency with observability plugin.
                      action: 'dxos.org/plugin/observability/send-event',
                      data: {
                        name: 'identity.joined',
                      },
                    },
                  ],
                ],
              };
            }

            case ClientAction.SHARE_IDENTITY: {
              const data = await client.shell.shareIdentity();
              return {
                data,
                intents: [
                  [
                    {
                      // NOTE: This action is hardcoded to avoid circular dependency with observability plugin.
                      action: 'dxos.org/plugin/observability/send-event',
                      data: {
                        name: 'identity.shared',
                        properties: {
                          deviceKey: data.device?.deviceKey.truncate(),
                          deviceKind: data.device?.kind,
                          error: data.error?.message,
                          canceled: data.cancelled,
                        },
                      },
                    },
                  ],
                ],
              };
            }
          }
        },
      },
    },
  };
};
