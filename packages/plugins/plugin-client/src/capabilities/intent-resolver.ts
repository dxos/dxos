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
import { PublicKey } from '@dxos/react-client';
import { type JoinPanelProps } from '@dxos/shell/react';

import { ClientCapabilities } from './capabilities';
import { IDENTITY_DIALOG, JOIN_DIALOG, RECOVER_CODE_DIALOG } from '../components';
import { ClientEvents } from '../events';
import { ClientAction, type ClientPluginOptions } from '../types';

type IntentResolverOptions = Pick<ClientPluginOptions, 'onReset'> & {
  context: PluginsContext;
  appName?: string;
};

export default ({ context, appName = 'Composer', onReset }: IntentResolverOptions) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: ClientAction.CreateIdentity,
      resolve: async () => {
        const manager = context.requestCapability(Capabilities.PluginManager);
        const client = context.requestCapability(ClientCapabilities.Client);
        const data = await client.halo.createIdentity();
        await manager.activate(ClientEvents.IdentityCreated);
        return {
          data,
          intents: [
            createIntent(ObservabilityAction.SendEvent, {
              name: 'identity.create',
            }),
          ],
        };
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
            createIntent(ObservabilityAction.SendEvent, {
              name: 'identity.share',
            }),
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
        // TODO(wittjosiah): This needs a proper api.
        const { recoveryCode } = await client.services.services.IdentityService.createRecoveryCredential({});
        return {
          intents: [
            createIntent(LayoutAction.UpdateDialog, {
              part: 'dialog',
              subject: RECOVER_CODE_DIALOG,
              options: {
                blockAlign: 'start',
                type: 'alert',
                props: { code: recoveryCode },
              },
            }),
          ],
        };
      },
    }),
    createResolver({
      intent: ClientAction.CreatePasskey,
      resolve: async () => {
        const client = context.requestCapability(ClientCapabilities.Client);
        const identity = client.halo.identity.get();
        invariant(identity, 'Identity not available');

        // TODO(wittjosiah): Consider factoring out passkey creation to the halo api.
        const lookupKey = PublicKey.random();
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge: new Uint8Array(),
            rp: { id: location.hostname, name: appName },
            user: {
              id: lookupKey.asUint8Array(),
              name: identity.did,
              displayName: identity.profile?.displayName ?? '',
            },
            pubKeyCredParams: [
              { type: 'public-key', alg: -8 }, // Ed25519 (not yet supported across all browsers)
              { type: 'public-key', alg: -7 }, // ES256
            ],
            // https://web.dev/articles/webauthn-discoverable-credentials#resident-key
            authenticatorSelection: {
              residentKey: 'required',
              requireResidentKey: true,
            },
          },
        });

        invariant(credential, 'Credential not available');
        const recoveryKey = PublicKey.from(new Uint8Array((credential as any).response.getPublicKey()));
        const algorithm = (credential as any).response.getPublicKeyAlgorithm() === -7 ? 'ES256' : 'ED25519';

        // TODO(wittjosiah): This needs a proper api.
        invariant(client.services.services.IdentityService, 'IdentityService not available');
        await client.services.services.IdentityService.createRecoveryCredential({
          data: {
            recoveryKey,
            algorithm,
            lookupKey,
          },
        });
      },
    }),
    createResolver({
      intent: ClientAction.RedeemPasskey,
      resolve: async () => {
        const client = context.requestCapability(ClientCapabilities.Client);
        // TODO(wittjosiah): This needs a proper api.
        invariant(client.services.services.IdentityService, 'IdentityService not available');
        const { deviceKey, controlFeedKey, challenge } =
          await client.services.services.IdentityService.requestRecoveryChallenge();
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge: Buffer.from(challenge, 'base64'),
            rpId: location.hostname,
            userVerification: 'required',
          },
        });
        const lookupKey = PublicKey.from(new Uint8Array((credential as any).response.userHandle));
        await client.services.services.IdentityService.recoverIdentity({
          external: {
            lookupKey,
            deviceKey,
            controlFeedKey,
            signature: Buffer.from((credential as any).response.signature),
            clientDataJson: Buffer.from((credential as any).response.clientDataJSON),
            authenticatorData: Buffer.from((credential as any).response.authenticatorData),
          },
        });
      },
    }),
  ]);
