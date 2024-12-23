//
// Copyright 2023 DXOS.org
//

import React from 'react';

import {
  LayoutAction,
  parseIntentPlugin,
  resolvePlugin,
  type PluginDefinition,
  createSurface,
  createIntent,
  createResolver,
} from '@dxos/app-framework';
import { Config, Defaults, Envs, Local, Storage } from '@dxos/config';
import { registerSignalsRuntime } from '@dxos/echo-signals/react';
import { invariant } from '@dxos/invariant';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { Client, ClientProvider } from '@dxos/react-client';
import { type IdentityPanelProps, type JoinPanelProps } from '@dxos/shell/react';

import {
  IDENTITY_DIALOG,
  IdentityDialog,
  JOIN_DIALOG,
  JoinDialog,
  RECOVER_CODE_DIALOG,
  RecoveryCodeDialog,
  type RecoveryCodeDialogProps,
} from './components';
import meta, { CLIENT_PLUGIN } from './meta';
import translations from './translations';
import { ClientAction, type ClientPluginOptions, type ClientPluginProvides } from './types';

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
    ready: async ({ plugins }) => {
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
        definitions: () => [
          createSurface({
            id: IDENTITY_DIALOG,
            role: 'dialog',
            filter: (data): data is { subject: IdentityPanelProps } => data.component === IDENTITY_DIALOG,
            component: ({ data }) => (
              <IdentityDialog {...data.subject} createInvitationUrl={createDeviceInvitationUrl} />
            ),
          }),
          createSurface({
            id: JOIN_DIALOG,
            role: 'dialog',
            filter: (data): data is { subject: JoinPanelProps } => data.component === JOIN_DIALOG,
            component: ({ data }) => <JoinDialog {...data.subject} />,
          }),
          createSurface({
            id: RECOVER_CODE_DIALOG,
            role: 'dialog',
            filter: (data): data is { subject: RecoveryCodeDialogProps } => data.component === RECOVER_CODE_DIALOG,
            component: ({ data }) => <RecoveryCodeDialog {...data.subject} />,
          }),
        ],
      },
      graph: {
        builder: (plugins) => {
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatchPromise;
          const id = `${CLIENT_PLUGIN}/open-shell`;

          return createExtension({
            id: CLIENT_PLUGIN,
            filter: (node): node is Node<null> => node.id === 'root',
            actions: () => [
              {
                id,
                data: async () => {
                  await dispatch?.(createIntent(ClientAction.ShareIdentity));
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
        resolvers: () => [
          createResolver(ClientAction.CreateIdentity, async () => {
            const data = await client.halo.createIdentity();
            return { data, intents: [createIntent(ObservabilityAction.SendEvent, { name: 'identity.create' })] };
          }),
          createResolver(ClientAction.JoinIdentity, async (data) => {
            return {
              intents: [
                createIntent(LayoutAction.SetLayout, {
                  element: 'dialog',
                  component: JOIN_DIALOG,
                  dialogBlockAlign: 'start',
                  subject: {
                    initialInvitationCode: data.invitationCode,
                    initialDisposition: 'accept-halo-invitation',
                  } satisfies Partial<JoinPanelProps>,
                }),
              ],
            };
          }),
          createResolver(ClientAction.ShareIdentity, async () => {
            return {
              intents: [
                createIntent(LayoutAction.SetLayout, {
                  element: 'dialog',
                  component: IDENTITY_DIALOG,
                  dialogBlockAlign: 'start',
                }),
                createIntent(ObservabilityAction.SendEvent, { name: 'identity.share' }),
              ],
            };
          }),
          createResolver(ClientAction.RecoverIdentity, async () => {
            return {
              intents: [
                createIntent(LayoutAction.SetLayout, {
                  element: 'dialog',
                  component: JOIN_DIALOG,
                  dialogBlockAlign: 'start',
                  subject: { initialDisposition: 'recover-identity' } satisfies Partial<JoinPanelProps>,
                }),
              ],
            };
          }),
          createResolver(ClientAction.ResetStorage, async (data) => {
            await onReset?.({ target: data.target });
            return {};
          }),
          createResolver(ClientAction.CreateAgent, async () => {
            invariant(client.services.services.EdgeAgentService, 'Missing EdgeAgentService');
            await client.services.services.EdgeAgentService.createAgent(null as any, { timeout: 10_000 });
          }),
          createResolver(ClientAction.CreateRecoveryCode, async () => {
            invariant(client.services.services.IdentityService, 'IdentityService not available');
            // TODO(wittjosiah): This needs a proper api. Rename property.
            const { seedphrase } = await client.services.services.IdentityService.createRecoveryPhrase();
            return {
              intents: [
                createIntent(LayoutAction.SetLayout, {
                  element: 'dialog',
                  dialogBlockAlign: 'start',
                  dialogType: 'alert',
                  state: true,
                  component: RECOVER_CODE_DIALOG,
                  subject: { code: seedphrase },
                }),
              ],
            };
          }),
        ],
      },
    },
  };
};
