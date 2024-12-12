//
// Copyright 2023 DXOS.org
//

import React from 'react';

import {
  LayoutAction,
  parseIntentPlugin,
  resolvePlugin,
  type SurfaceProvides,
  type GraphBuilderProvides,
  type IntentResolverProvides,
  type Plugin,
  type PluginDefinition,
  type TranslationsProvides,
} from '@dxos/app-framework';
import { Config, Defaults, Envs, Local, Storage } from '@dxos/config';
import { registerSignalsRuntime } from '@dxos/echo-signals/react';
import { invariant } from '@dxos/invariant';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { Client, type ClientOptions, ClientProvider } from '@dxos/react-client';
import { type IdentityPanelProps, type JoinPanelProps } from '@dxos/shell/react';

import { IdentityDialog, JoinDialog, RecoveryCodeDialog, type RecoveryCodeDialogProps } from './components';
import meta, { CLIENT_PLUGIN, ClientAction, OBSERVABILITY_ACTION } from './meta';
import translations from './translations';

export type ClientPluginOptions = ClientOptions & {
  /**
   * Used to track app-specific state in spaces.
   */
  appKey: string;

  /**
   * Base URL for the invitation link.
   */
  invitationUrl?: string;

  /**
   * Query parameter for the invitation code.
   */
  invitationParam?: string;

  /**
   * Run after the client has been initialized.
   */
  onClientInitialized?: (client: Client) => Promise<void>;

  /**
   * Run after the identity has been successfully initialized.
   * Run with client during plugin ready phase.
   */
  onReady?: (client: Client, plugins: Plugin[]) => Promise<void>;

  /**
   * Called when the client is reset.
   */
  onReset?: (params: { target?: string }) => Promise<void>;
};

export type ClientPluginProvides = IntentResolverProvides &
  GraphBuilderProvides &
  SurfaceProvides &
  TranslationsProvides & {
    client: Client;
  };

export const parseClientPlugin = (plugin?: Plugin) =>
  (plugin?.provides as any).client instanceof Client ? (plugin as Plugin<ClientPluginProvides>) : undefined;

export const ClientPlugin = ({
  appKey,
  invitationUrl = window.location.origin,
  invitationParam = 'deviceInvitationCode',
  onClientInitialized,
  onReady,
  onReset,
  ...options
}: ClientPluginOptions): PluginDefinition<
  Omit<ClientPluginProvides, 'client'>,
  Pick<ClientPluginProvides, 'client'>
> => {
  registerSignalsRuntime();

  let client: Client;
  let error: unknown = null;

  const createDeviceInvitationUrl = (invitationCode: string) => {
    const baseUrl = new URL(invitationUrl);
    baseUrl.searchParams.set(invitationParam, invitationCode);
    return baseUrl.toString();
  };

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
        context: ({ children }) => <ClientProvider client={client}>{children}</ClientProvider>,
      };
    },
    ready: async (plugins) => {
      if (error) {
        throw error;
      }

      await onReady?.(client, plugins);
    },
    unload: async () => {
      await client.destroy();
    },
    provides: {
      translations,
      surface: {
        component: ({ data, role, ...rest }) => {
          switch (role) {
            case 'dialog':
              if (data.component === 'dxos.org/plugin/client/IdentityDialog') {
                return (
                  <IdentityDialog
                    {...(data.subject as IdentityPanelProps)}
                    createInvitationUrl={createDeviceInvitationUrl}
                  />
                );
              } else if (data.component === 'dxos.org/plugin/client/JoinDialog') {
                return <JoinDialog {...(data.subject as JoinPanelProps)} />;
              } else if (data.component === 'dxos.org/plugin/client/RecoveryCodeDialog') {
                return <RecoveryCodeDialog {...(data.subject as RecoveryCodeDialogProps)} />;
              }
              break;
          }

          return null;
        },
      },
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
                    { plugin: CLIENT_PLUGIN, action: ClientAction.SHARE_IDENTITY },
                  ]);
                },
                properties: {
                  label: ['open shell label', { ns: CLIENT_PLUGIN }],
                  icon: 'ph--address-book--regular',
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
            case ClientAction.CREATE_IDENTITY: {
              const data = await client.halo.createIdentity();
              return {
                data,
                intents: [
                  [
                    {
                      action: OBSERVABILITY_ACTION,
                      data: {
                        name: 'identity.create',
                      },
                    },
                  ],
                ],
              };
            }

            case ClientAction.JOIN_IDENTITY: {
              return {
                data: true,
                intents: [
                  [
                    {
                      action: LayoutAction.SET_LAYOUT,
                      data: {
                        element: 'dialog',
                        component: 'dxos.org/plugin/client/JoinDialog',
                        dialogBlockAlign: 'start',
                        subject: {
                          initialInvitationCode: intent.data?.invitationCode,
                          initialDisposition: 'accept-halo-invitation',
                        } satisfies Partial<JoinPanelProps>,
                      },
                    },
                  ],
                ],
              };
            }

            case ClientAction.SHARE_IDENTITY: {
              return {
                data: true,
                intents: [
                  [
                    {
                      action: LayoutAction.SET_LAYOUT,
                      data: {
                        element: 'dialog',
                        component: 'dxos.org/plugin/client/IdentityDialog',
                        dialogBlockAlign: 'start',
                      },
                    },
                  ],
                  [
                    {
                      action: OBSERVABILITY_ACTION,
                      data: {
                        name: 'identity.share',
                      },
                    },
                  ],
                ],
              };
            }

            case ClientAction.RECOVER_IDENTITY: {
              return {
                data: true,
                intents: [
                  [
                    {
                      action: LayoutAction.SET_LAYOUT,
                      data: {
                        element: 'dialog',
                        component: 'dxos.org/plugin/client/JoinDialog',
                        dialogBlockAlign: 'start',
                        subject: {
                          initialDisposition: 'recover-identity',
                        } satisfies Partial<JoinPanelProps>,
                      },
                    },
                  ],
                ],
              };
            }

            case ClientAction.RESET_STORAGE: {
              await onReset?.({ target: intent.data?.target });
              return { data: true };
            }

            case ClientAction.CREATE_AGENT: {
              invariant(client.services.services.EdgeAgentService, 'Missing EdgeAgentService');
              await client.services.services.EdgeAgentService.createAgent(null as any, { timeout: 10_000 });
              return { data: true };
            }

            case ClientAction.CREATE_RECOVERY_CODE: {
              invariant(client.services.services.IdentityService, 'IdentityService not available');
              // TODO(wittjosiah): This needs a proper api. Rename property.
              const { seedphrase } = await client.services.services.IdentityService.createRecoveryPhrase();
              return {
                data: true,
                intents: [
                  [
                    {
                      action: LayoutAction.SET_LAYOUT,
                      data: {
                        element: 'dialog',
                        dialogBlockAlign: 'start',
                        dialogType: 'alert',
                        state: true,
                        component: 'dxos.org/plugin/client/RecoveryCodeDialog',
                        subject: { code: seedphrase },
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
