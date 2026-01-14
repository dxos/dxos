//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, FollowupScheduler, OperationResolver } from '@dxos/app-framework';
import { PublicKey } from '@dxos/client';
import { runAndForwardErrors } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { ObservabilityOperation } from '@dxos/plugin-observability/types';
import { type JoinPanelProps } from '@dxos/shell/react';

import { JOIN_DIALOG, RECOVERY_CODE_DIALOG, RESET_DIALOG } from '../../constants';
import { ClientEvents } from '../../events';
import { Account, ClientCapabilities, ClientOperation } from '../../types';

type OperationResolverOptions = {
  appName?: string;
};

const RECOVER_IDENTITY_RPC_TIMEOUT = 20_000;

export default Capability.makeModule(
  Effect.fnUntraced(function* (props?: OperationResolverOptions) {
    const { appName = 'Composer' } = props ?? {};
    const context = yield* Capability.PluginContextService;

    return Capability.contributes(Common.Capability.OperationResolver, [
      //
      // CreateIdentity
      //
      OperationResolver.make({
        operation: ClientOperation.CreateIdentity,
        handler: (profile) =>
          Effect.gen(function* () {
            const manager = context.getCapability(Common.Capability.PluginManager);
            const client = context.getCapability(ClientCapabilities.Client);
            const scheduler = yield* FollowupScheduler.Service;
            const data = yield* Effect.promise(() => client.halo.createIdentity(profile));
            yield* Effect.promise(() => runAndForwardErrors(manager.activate(ClientEvents.IdentityCreated)));
            yield* scheduler.schedule(ObservabilityOperation.SendEvent, { name: 'identity.create' });
            return data;
          }),
      }),

      //
      // JoinIdentity
      //
      OperationResolver.make({
        operation: ClientOperation.JoinIdentity,
        handler: (data) =>
          Effect.gen(function* () {
            const { invoke } = yield* Capability.get(Common.Capability.OperationInvoker);
            yield* invoke(Common.LayoutOperation.UpdateDialog, {
              subject: JOIN_DIALOG,
              blockAlign: 'start',
              props: {
                initialInvitationCode: data.invitationCode,
                initialDisposition: 'accept-halo-invitation',
              },
            });
          }).pipe(Effect.provideService(Capability.PluginContextService, context)),
      }),

      //
      // ShareIdentity
      //
      OperationResolver.make({
        operation: ClientOperation.ShareIdentity,
        handler: () =>
          Effect.gen(function* () {
            const { invoke } = yield* Capability.get(Common.Capability.OperationInvoker);
            const scheduler = yield* FollowupScheduler.Service;
            yield* invoke(Common.LayoutOperation.SwitchWorkspace, { subject: Account.id });
            yield* invoke(Common.LayoutOperation.Open, { subject: [Account.Profile] });
            yield* scheduler.schedule(ObservabilityOperation.SendEvent, { name: 'identity.share' });
          }).pipe(Effect.provideService(Capability.PluginContextService, context)),
      }),

      //
      // RecoverIdentity
      //
      OperationResolver.make({
        operation: ClientOperation.RecoverIdentity,
        handler: () =>
          Effect.gen(function* () {
            const { invoke } = yield* Capability.get(Common.Capability.OperationInvoker);
            yield* invoke(Common.LayoutOperation.UpdateDialog, {
              subject: JOIN_DIALOG,
              blockAlign: 'start',
              props: {
                initialDisposition: 'recover-identity',
              } satisfies Partial<JoinPanelProps>,
            });
          }).pipe(Effect.provideService(Capability.PluginContextService, context)),
      }),

      //
      // ResetStorage
      //
      OperationResolver.make({
        operation: ClientOperation.ResetStorage,
        handler: (data) =>
          Effect.gen(function* () {
            const { invoke } = yield* Capability.get(Common.Capability.OperationInvoker);
            yield* invoke(Common.LayoutOperation.UpdateDialog, {
              subject: RESET_DIALOG,
              blockAlign: 'start',
              props: {
                mode: data.mode ?? 'reset storage',
              },
            });
          }).pipe(Effect.provideService(Capability.PluginContextService, context)),
      }),

      //
      // CreateAgent
      //
      OperationResolver.make({
        operation: ClientOperation.CreateAgent,
        handler: () =>
          Effect.promise(async () => {
            const client = context.getCapability(ClientCapabilities.Client);
            invariant(client.services.services.EdgeAgentService, 'Missing EdgeAgentService');
            await client.services.services.EdgeAgentService.createAgent(undefined, { timeout: 10_000 });
          }),
      }),

      //
      // CreateRecoveryCode
      //
      OperationResolver.make({
        operation: ClientOperation.CreateRecoveryCode,
        handler: () =>
          Effect.gen(function* () {
            const { invoke } = yield* Capability.get(Common.Capability.OperationInvoker);
            const client = context.getCapability(ClientCapabilities.Client);
            invariant(client.services.services.IdentityService, 'IdentityService not available');
            const { recoveryCode } = yield* Effect.promise(() =>
              client.services.services.IdentityService!.createRecoveryCredential({}),
            );
            yield* invoke(Common.LayoutOperation.UpdateDialog, {
              subject: RECOVERY_CODE_DIALOG,
              blockAlign: 'start',
              type: 'alert',
              props: { code: recoveryCode },
            });
          }).pipe(Effect.provideService(Capability.PluginContextService, context)),
      }),

      //
      // CreatePasskey
      //
      OperationResolver.make({
        operation: ClientOperation.CreatePasskey,
        handler: () =>
          Effect.promise(async () => {
            const client = context.getCapability(ClientCapabilities.Client);
            const identity = client.halo.identity.get();
            invariant(identity, 'Identity not available');

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
                authenticatorSelection: {
                  residentKey: 'required',
                  requireResidentKey: true,
                },
              },
            });

            invariant(credential, 'Credential not available');
            const recoveryKey = PublicKey.from(new Uint8Array((credential as any).response.getPublicKey()));
            const algorithm = (credential as any).response.getPublicKeyAlgorithm() === -7 ? 'ES256' : 'ED25519';

            invariant(client.services.services.IdentityService, 'IdentityService not available');
            await client.services.services.IdentityService.createRecoveryCredential({
              data: {
                recoveryKey,
                algorithm,
                lookupKey,
              },
            });
          }),
      }),

      //
      // RedeemPasskey
      //
      OperationResolver.make({
        operation: ClientOperation.RedeemPasskey,
        handler: () =>
          Effect.promise(async () => {
            const client = context.getCapability(ClientCapabilities.Client);
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
          }),
      }),

      //
      // RedeemToken
      //
      OperationResolver.make({
        operation: ClientOperation.RedeemToken,
        handler: (data) =>
          Effect.promise(async () => {
            const client = context.getCapability(ClientCapabilities.Client);
            invariant(client.services.services.IdentityService, 'IdentityService not available');
            await client.services.services.IdentityService.recoverIdentity(
              { token: data.token },
              { timeout: RECOVER_IDENTITY_RPC_TIMEOUT },
            );
          }),
      }),
    ]);
  }),
);
