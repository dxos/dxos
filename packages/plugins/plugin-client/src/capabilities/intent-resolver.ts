//
// Copyright 2025 DXOS.org
//

import {
  Capabilities,
  contributes,
  createIntent,
  createResolver,
  LayoutAction,
  type PluginsContext,
} from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { type JoinPanelProps } from '@dxos/shell/react';

import { ClientCapabilities } from './capabilities';
import { IDENTITY_DIALOG, JOIN_DIALOG, RECOVER_CODE_DIALOG } from '../components';
import { ClientEvents } from '../events';
import { ClientAction, type ClientPluginOptions } from '../types';

type IntentResolverOptions = Pick<ClientPluginOptions, 'onReset'> & {
  context: PluginsContext;
};

export default ({ context, onReset }: IntentResolverOptions) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: ClientAction.CreateIdentity,
      resolve: async () => {
        const manager = context.requestCapability(Capabilities.PluginManager);
        const client = context.requestCapability(ClientCapabilities.Client);
        const data = await client.halo.createIdentity();
        await manager.activate(ClientEvents.IdentityCreated);
        return { data, intents: [createIntent(ObservabilityAction.SendEvent, { name: 'identity.create' })] };
      },
    }),
    createResolver({
      intent: ClientAction.JoinIdentity,
      resolve: async (data) => {
        return {
          intents: [
            createIntent(LayoutAction.UpdateDialog, {
              part: 'dialog',
              subject: JOIN_DIALOG,
              options: {
                blockAlign: 'start',
                props: {
                  initialInvitationCode: data.invitationCode,
                  initialDisposition: 'accept-halo-invitation',
                },
              },
            }),
          ],
        };
      },
    }),
    createResolver({
      intent: ClientAction.ShareIdentity,
      resolve: async () => {
        return {
          intents: [
            createIntent(LayoutAction.UpdateDialog, {
              part: 'dialog',
              subject: IDENTITY_DIALOG,
              options: {
                blockAlign: 'start',
              },
            }),
            createIntent(ObservabilityAction.SendEvent, { name: 'identity.share' }),
          ],
        };
      },
    }),
    createResolver({
      intent: ClientAction.RecoverIdentity,
      resolve: async () => {
        return {
          intents: [
            createIntent(LayoutAction.UpdateDialog, {
              part: 'dialog',
              subject: JOIN_DIALOG,
              options: {
                blockAlign: 'start',
                props: {
                  initialDisposition: 'recover-identity',
                } satisfies Partial<JoinPanelProps>,
              },
            }),
          ],
        };
      },
    }),
    createResolver({
      intent: ClientAction.ResetStorage,
      resolve: async (data) => {
        await onReset?.({ target: data.target });
      },
    }),
    createResolver({
      intent: ClientAction.CreateAgent,
      resolve: async () => {
        const client = context.requestCapability(ClientCapabilities.Client);
        invariant(client.services.services.EdgeAgentService, 'Missing EdgeAgentService');
        await client.services.services.EdgeAgentService.createAgent(null as any, { timeout: 10_000 });
      },
    }),
    createResolver({
      intent: ClientAction.CreateRecoveryCode,
      resolve: async () => {
        const client = context.requestCapability(ClientCapabilities.Client);
        invariant(client.services.services.IdentityService, 'IdentityService not available');
        // TODO(wittjosiah): This needs a proper api. Rename property.
        const { seedphrase } = await client.services.services.IdentityService.createRecoveryPhrase();
        return {
          intents: [
            createIntent(LayoutAction.UpdateDialog, {
              part: 'dialog',
              subject: RECOVER_CODE_DIALOG,
              options: {
                blockAlign: 'start',
                type: 'alert',
                props: { code: seedphrase },
              },
            }),
          ],
        };
      },
    }),
  ]);
