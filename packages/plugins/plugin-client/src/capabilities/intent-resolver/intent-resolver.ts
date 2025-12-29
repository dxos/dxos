//
// Copyright 2025 DXOS.org
//

import * as Function from 'effect/Function';

import {
  Capability,
  Common,
  chain,
  createIntent,
  createResolver,
} from '@dxos/app-framework';
import { PublicKey } from '@dxos/client';
import { invariant } from '@dxos/invariant';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { type JoinPanelProps } from '@dxos/shell/react';

import { JOIN_DIALOG, RECOVERY_CODE_DIALOG, RESET_DIALOG } from '../../constants';
import { ClientEvents } from '../../events';
import { Account, ClientAction, ClientCapabilities } from '../../types';

type IntentResolverOptions = {
  context: Capability.PluginContext;
  appName?: string;
};

const RECOVER_IDENTITY_RPC_TIMEOUT = 20_000;

export default Capability.makeModule(({ context, appName = 'Composer' }: IntentResolverOptions) =>
  Capability.contributes(Common.Capability.IntentResolver, [
    createResolver({
      intent: ClientAction.CreateIdentity,
      resolve: async (profile) => {
        const manager = context.getCapability(Common.Capability.PluginManager);
        const client = context.getCapability(ClientCapabilities.Client);
        const data = await client.halo.createIdentity(profile);
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
            createIntent(Common.LayoutAction.UpdateDialog, {
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
            Function.pipe(
              createIntent(Common.LayoutAction.SwitchWorkspace, {
                part: 'workspace',
                subject: Account.id,
              }),
              chain(Common.LayoutAction.Open, {
                part: 'main',
                subject: [Account.Profile],
              }),
            ),
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
            createIntent(Common.LayoutAction.UpdateDialog, {
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
        return {
          intents: [
            createIntent(Common.LayoutAction.UpdateDialog, {
              part: 'dialog',
              subject: RESET_DIALOG,
              options: {
                blockAlign: 'start',
                props: {
                  mode: data.mode ?? 'reset storage',
                },
              },
            }),
          ],
        };
      },
    }),
    createResolver({
      intent: ClientAction.CreateAgent,
      resolve: async () => {
        const client = context.getCapability(ClientCapabilities.Client);
        invariant(client.services.services.EdgeAgentService, 'Missing EdgeAgentService');
        await client.services.services.EdgeAgentService.createAgent(null as any, { timeout: 10_000 });
      },
    }),
    createResolver({
      intent: ClientAction.CreateRecoveryCode,
      resolve: async () => {
        const client = context.getCapability(ClientCapabilities.Client);
        invariant(client.services.services.IdentityService, 'IdentityService not available');
        // TODO(wittjosiah): This needs a proper api.
        const { recoveryCode } = await client.services.services.IdentityService.createRecoveryCredential({});
        return {
          intents: [
            createIntent(Common.LayoutAction.UpdateDialog, {
              part: 'dialog',
              subject: RECOVERY_CODE_DIALOG,
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
        const client = context.getCapability(ClientCapabilities.Client);
        const identity = client.halo.identity.get();
        invariant(identity, 'Identity not available');

        // TODO(wittjosiah): Consider factoring out passkey creation to the halo api.
        const lookupKey = PublicKey.random();
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge: new Uint8Array(),
            rp: { id: location.hostname, name: appName },
            user: {
              id: lookupKey.asUint8Array() as Uint8Array<ArrayBuffer>,
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
        const client = context.getCapability(ClientCapabilities.Client);
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
        await client.services.services.IdentityService.recoverIdentity(
          {
            external: {
              lookupKey,
              deviceKey,
              controlFeedKey,
              signature: Buffer.from((credential as any).response.signature),
              clientDataJson: Buffer.from((credential as any).response.clientDataJSON),
              authenticatorData: Buffer.from((credential as any).response.authenticatorData),
            },
          },
          { timeout: RECOVER_IDENTITY_RPC_TIMEOUT },
        );
      },
    }),
    createResolver({
      intent: ClientAction.RedeemToken,
      resolve: async (data) => {
        const client = context.getCapability(ClientCapabilities.Client);
        // TODO(wittjosiah): This needs a proper api.
        invariant(client.services.services.IdentityService, 'IdentityService not available');
        await client.services.services.IdentityService.recoverIdentity(
          { token: data.token },
          { timeout: RECOVER_IDENTITY_RPC_TIMEOUT },
        );
      },
    }),
  ]),
);
