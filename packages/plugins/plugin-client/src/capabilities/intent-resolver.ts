//
// Copyright 2025 DXOS.org
//

import { LayoutAction, createIntent, createResolver } from '@dxos/app-framework';
import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework/next';
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
    createResolver(ClientAction.CreateIdentity, async () => {
      const manager = context.requestCapability(Capabilities.PluginManager);
      const client = context.requestCapability(ClientCapabilities.Client);
      const data = await client.halo.createIdentity();
      await manager.activate(ClientEvents.IdentityCreated);
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
      const client = context.requestCapability(ClientCapabilities.Client);
      invariant(client.services.services.EdgeAgentService, 'Missing EdgeAgentService');
      await client.services.services.EdgeAgentService.createAgent(null as any, { timeout: 10_000 });
    }),
    createResolver(ClientAction.CreateRecoveryCode, async () => {
      const client = context.requestCapability(ClientCapabilities.Client);
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
  ]);
