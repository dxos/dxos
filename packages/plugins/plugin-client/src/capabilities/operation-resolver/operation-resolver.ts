//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { PublicKey } from '@dxos/client';
import { runAndForwardErrors } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { OperationResolver } from '@dxos/operation';
import { Operation } from '@dxos/operation';
import { ObservabilityOperation } from '@dxos/plugin-observability/types';
import {
  type CreateRecoveryCredentialResponse,
  type RequestRecoveryChallengeResponse,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { type JoinPanelProps } from '@dxos/shell/react';

import { JOIN_DIALOG, RECOVERY_CODE_DIALOG, RESET_DIALOG } from '../../constants';
import { ClientEvents } from '../../types';
import { Account, ClientCapabilities, ClientOperation } from '../../types';

type OperationResolverOptions = {
  appName?: string;
};

const RECOVER_IDENTITY_RPC_TIMEOUT = 20_000;

export default Capability.makeModule(
  Effect.fnUntraced(function* (props?: OperationResolverOptions) {
    const { appName = 'Composer' } = props ?? {};

    return Capability.contributes(Capabilities.OperationResolver, [
      //
      // CreateIdentity
      //
      OperationResolver.make({
        operation: ClientOperation.CreateIdentity,
        handler: Effect.fnUntraced(function* (profile) {
          const manager = yield* Capability.get(Capabilities.PluginManager);
          const client = yield* Capability.get(ClientCapabilities.Client);
          const data = yield* Effect.promise(() => client.halo.createIdentity(profile));
          yield* Effect.promise(() => runAndForwardErrors(manager.activate(ClientEvents.IdentityCreated)));
          yield* Operation.schedule(ObservabilityOperation.SendEvent, { name: 'identity.create' });
          return data;
        }),
      }),

      //
      // JoinIdentity
      //
      OperationResolver.make({
        operation: ClientOperation.JoinIdentity,
        handler: Effect.fnUntraced(function* (data) {
          yield* Operation.invoke(LayoutOperation.UpdateDialog, {
            subject: JOIN_DIALOG,
            blockAlign: 'start',
            props: {
              initialInvitationCode: data.invitationCode,
              initialDisposition: 'accept-halo-invitation',
            },
          });
        }),
      }),

      //
      // ShareIdentity
      //
      OperationResolver.make({
        operation: ClientOperation.ShareIdentity,
        handler: Effect.fnUntraced(function* () {
          yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: Account.id });
          yield* Operation.invoke(LayoutOperation.Open, { subject: [Account.Profile] });
          yield* Operation.schedule(ObservabilityOperation.SendEvent, { name: 'identity.share' });
        }),
      }),

      //
      // RecoverIdentity
      //
      OperationResolver.make({
        operation: ClientOperation.RecoverIdentity,
        handler: Effect.fnUntraced(function* () {
          yield* Operation.invoke(LayoutOperation.UpdateDialog, {
            subject: JOIN_DIALOG,
            blockAlign: 'start',
            props: {
              initialDisposition: 'recover-identity',
            } satisfies Partial<JoinPanelProps>,
          });
        }),
      }),

      //
      // ResetStorage
      //
      OperationResolver.make({
        operation: ClientOperation.ResetStorage,
        handler: Effect.fnUntraced(function* (data) {
          yield* Operation.invoke(LayoutOperation.UpdateDialog, {
            subject: RESET_DIALOG,
            blockAlign: 'start',
            props: {
              mode: data.mode ?? 'reset storage',
            },
          });
        }),
      }),

      //
      // CreateAgent
      //
      OperationResolver.make({
        operation: ClientOperation.CreateAgent,
        handler: Effect.fnUntraced(function* () {
          const client = yield* Capability.get(ClientCapabilities.Client);
          invariant(client.services.services.EdgeAgentService, 'Missing EdgeAgentService');
          yield* Effect.promise(() =>
            client.services.services.EdgeAgentService!.createAgent(undefined, { timeout: 10_000 }),
          );
        }),
      }),

      //
      // CreateRecoveryCode
      //
      OperationResolver.make({
        operation: ClientOperation.CreateRecoveryCode,
        handler: Effect.fnUntraced(function* () {
          const client = yield* Capability.get(ClientCapabilities.Client);
          invariant(client.services.services.IdentityService, 'IdentityService not available');
          const { recoveryCode } = (yield* Effect.promise(() =>
            client.services.services.IdentityService!.createRecoveryCredential({}),
          )) as CreateRecoveryCredentialResponse;
          yield* Operation.invoke(LayoutOperation.UpdateDialog, {
            subject: RECOVERY_CODE_DIALOG,
            blockAlign: 'start',
            type: 'alert',
            props: { code: recoveryCode },
          });
        }),
      }),

      //
      // CreatePasskey
      //
      OperationResolver.make({
        operation: ClientOperation.CreatePasskey,
        handler: Effect.fnUntraced(function* () {
          const client = yield* Capability.get(ClientCapabilities.Client);
          const identity = client.halo.identity.get();
          invariant(identity, 'Identity not available');

          const lookupKey = PublicKey.random();
          const credential = yield* Effect.promise(() =>
            navigator.credentials.create({
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
            }),
          );

          invariant(credential, 'Credential not available');
          const recoveryKey = PublicKey.from(
            new Uint8Array(
              (credential as PublicKeyCredential).response as AuthenticatorAttestationResponse extends {
                getPublicKey(): ArrayBuffer;
              }
                ? never
                : ArrayBuffer,
            ),
          );
          const algorithm =
            (
              (credential as PublicKeyCredential).response as AuthenticatorAttestationResponse & {
                getPublicKeyAlgorithm(): number;
              }
            ).getPublicKeyAlgorithm() === -7
              ? 'ES256'
              : 'ED25519';

          invariant(client.services.services.IdentityService, 'IdentityService not available');
          yield* Effect.promise(() =>
            client.services.services.IdentityService!.createRecoveryCredential({
              data: {
                recoveryKey,
                algorithm,
                lookupKey,
              },
            }),
          );
        }),
      }),

      //
      // RedeemPasskey
      //
      OperationResolver.make({
        operation: ClientOperation.RedeemPasskey,
        handler: Effect.fnUntraced(function* () {
          const client = yield* Capability.get(ClientCapabilities.Client);
          invariant(client.services.services.IdentityService, 'IdentityService not available');
          const { deviceKey, controlFeedKey, challenge } = (yield* Effect.promise(() =>
            client.services.services.IdentityService!.requestRecoveryChallenge(),
          )) as RequestRecoveryChallengeResponse;
          const credential = yield* Effect.promise(() =>
            navigator.credentials.get({
              publicKey: {
                challenge: Buffer.from(challenge, 'base64'),
                rpId: location.hostname,
                userVerification: 'required',
              },
            }),
          );
          const lookupKey = PublicKey.from(
            new Uint8Array(
              ((credential as PublicKeyCredential).response as AuthenticatorAssertionResponse).userHandle!,
            ),
          );
          yield* Effect.promise(() =>
            client.services.services.IdentityService!.recoverIdentity(
              {
                external: {
                  lookupKey,
                  deviceKey,
                  controlFeedKey,
                  signature: Buffer.from(
                    ((credential as PublicKeyCredential).response as AuthenticatorAssertionResponse).signature,
                  ),
                  clientDataJson: Buffer.from(
                    ((credential as PublicKeyCredential).response as AuthenticatorAssertionResponse).clientDataJSON,
                  ),
                  authenticatorData: Buffer.from(
                    ((credential as PublicKeyCredential).response as AuthenticatorAssertionResponse).authenticatorData,
                  ),
                },
              },
              { timeout: RECOVER_IDENTITY_RPC_TIMEOUT },
            ),
          );
        }),
      }),

      //
      // RedeemToken
      //
      OperationResolver.make({
        operation: ClientOperation.RedeemToken,
        handler: Effect.fnUntraced(function* (data) {
          const client = yield* Capability.get(ClientCapabilities.Client);
          invariant(client.services.services.IdentityService, 'IdentityService not available');
          yield* Effect.promise(() =>
            client.services.services.IdentityService!.recoverIdentity(
              { token: data.token },
              { timeout: RECOVER_IDENTITY_RPC_TIMEOUT },
            ),
          );
        }),
      }),
    ]);
  }),
);
