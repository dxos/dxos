//
// Copyright 2023 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as EffectStream from 'effect/Stream';
import * as SqlClient from 'effect/unstable/sql/SqlClient';

import { RegisterService } from '@dxos/client-protocol';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { Context, Resource } from '@dxos/context';
import { createCredential, signPresentation } from '@dxos/credentials';
import { EffectEx, Hook, RuntimeProvider } from '@dxos/effect';
import { BaseError } from '@dxos/errors';
import { invariant } from '@dxos/invariant';
import { type KeyringApi, KeyringApiService } from '@dxos/keyring';
import { toServiceError } from '@dxos/protocols';
import { buf, fromPublicKey } from '@dxos/protocols/buf';
import {
  type Identity as IdentityProto,
  IdentitySchema,
  type RecoverIdentityRequest,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import {
  AuthSchema,
  type Credential,
  type Presentation,
  type ProfileDocument,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { IdentityService } from '@dxos/protocols/rpc';
import { RpcRouter } from '@dxos/rpc';

import * as IdentityContract from '../../../contracts/identity.ts';
import * as SpacesContract from '../../../contracts/spaces.ts';
import * as Events from '../../../Events.ts';
import { type Identity } from '../../../Identity.ts';
import * as SqliteStorage from '../../../SqliteStorage.ts';
import { type CreateIdentityOptions } from './identity-manager.ts';
import { type EdgeIdentityRecoveryManager, EdgeIdentityRecoveryManagerService } from './identity-recovery-manager.ts';

export class IdentityServiceImpl extends Resource implements IdentityService.Handlers {
  'constructor'(
    private readonly _identityManager: IdentityContract.Manager,
    private readonly _recoveryManager: EdgeIdentityRecoveryManager,
    private readonly _keyring: KeyringApi,
    private readonly _dataSpaceManager: SpacesContract.Manager,
    private readonly _wipeStorage: () => Promise<void>,
    private readonly _createIdentity: (params: CreateIdentityOptions, ctx?: Context) => Promise<Identity>,
    private readonly _onProfileUpdate?: (profile: ProfileDocument | undefined) => Promise<void>,
  ) {
    super();
  }

  ['IdentityService.createIdentity'](
    request: IdentityService.CreateIdentityRequest,
  ): Effect.Effect<IdentityProto, BaseError> {
    return Effect.tryPromise({
      try: async () => {
        const ctx = Context.default();
        await this._createIdentity(
          {
            profile: request.profile,
            deviceProfile: request.deviceProfile,
          },
          ctx,
        );
        return this._getIdentity()!;
      },
      catch: toServiceError,
    });
  }

  ['IdentityService.queryIdentity'](): EffectStream.Stream<IdentityService.QueryIdentityResponse, Error> {
    return EffectEx.streamFromEmitter<IdentityService.QueryIdentityResponse, Error>((emit) => {
      // Omit `identity` entirely when absent: an explicit `undefined` would still drive the optional
      // protobuf codec, which dereferences the missing message and throws.
      const emitNext = () => {
        const identity = this._getIdentity();
        void emit.single(identity ? { identity } : {});
      };

      emitNext();
      const unsubscribe = this._identityManager.stateUpdate.on(emitNext);
      return Effect.sync(() => unsubscribe());
    });
  }

  ['IdentityService.updateProfile'](profile: ProfileDocument): Effect.Effect<IdentityProto, BaseError> {
    return Effect.tryPromise({
      try: async () => {
        invariant(this._identityManager.identity, 'Identity not initialized.');
        await this._identityManager.updateProfile(profile);
        await this._onProfileUpdate?.(this._identityManager.identity.profileDocument);
        return this._getIdentity()!;
      },
      catch: toServiceError,
    });
  }

  ['IdentityService.createRecoveryCredential'](
    request: IdentityService.CreateRecoveryCredentialRequest,
  ): Effect.Effect<IdentityService.CreateRecoveryCredentialResponse, BaseError> {
    return Effect.tryPromise({
      try: async () => this._recoveryManager.createRecoveryCredential(request),
      catch: toServiceError,
    });
  }

  ['IdentityService.revokeRecoveryCredential'](
    request: IdentityService.RevokeRecoveryCredentialRequest,
  ): Effect.Effect<void, BaseError> {
    return Effect.tryPromise({
      try: async () => this._recoveryManager.revokeRecoveryCredential(request),
      catch: toServiceError,
    });
  }

  ['IdentityService.requestRecoveryChallenge'](): Effect.Effect<
    IdentityService.RequestRecoveryChallengeResponse,
    Error
  > {
    return Effect.tryPromise({
      try: async () => this._recoveryManager.requestRecoveryChallenge(Context.default()),
      catch: toServiceError,
    });
  }

  ['IdentityService.recoverIdentity'](request: RecoverIdentityRequest): Effect.Effect<IdentityProto, BaseError> {
    return Effect.tryPromise({
      try: async () => {
        const ctx = Context.default();
        // buf models the `request` oneof as a tagged union, so the cases are exhaustive here.
        switch (request.request.case) {
          case 'recoveryCode':
            await this._recoveryManager.recoverIdentity(ctx, { recoveryCode: request.request.value });
            break;
          case 'external':
            await this._recoveryManager.recoverIdentityWithExternalSignature(ctx, request.request.value);
            break;
          case 'token':
            await this._recoveryManager.recoverIdentityWithToken(ctx, { token: request.request.value });
            break;
          case 'recoveryProof':
            await this._recoveryManager.recoverIdentityWithToken(ctx, { recoveryProof: request.request.value });
            break;
          case undefined:
            throw new Error('Invalid request.');
        }

        return this._getIdentity()!;
      },
      catch: toServiceError,
    });
  }

  /**
   * Closes and deletes every space, closes and deletes the identity, then removes the persisted
   * bytes they leave behind: the automerge documents, the hypercore files, the feed store, the
   * index tables and the keyring. The stack stays open throughout, so the client is left exactly as
   * it was before an identity existed and `createIdentity` can run straight afterwards.
   */
  ['IdentityService.deleteIdentity'](): Effect.Effect<void, BaseError> {
    return Effect.tryPromise({
      try: async () => {
        const ctx = Context.default();
        // Spaces first: their teardown leaves the swarm and flushes through the identity's HALO,
        // which the identity teardown below closes.
        await this._dataSpaceManager.deleteAllSpaces(ctx);
        await this._identityManager.deleteIdentity(ctx);
        // Last, so nothing still holds the rows it removes.
        await this._wipeStorage();
      },
      catch: toServiceError,
    });
  }

  // TODO(burdon): Rename createPresentation?
  ['IdentityService.signPresentation'](
    request: IdentityService.SignPresentationRequest,
  ): Effect.Effect<Presentation, BaseError> {
    return Effect.tryPromise({
      try: async () => {
        const { presentation, nonce } = request;
        invariant(this._identityManager.identity, 'Identity not initialized.');

        return await signPresentation({
          presentation: presentation,
          signer: this._keyring,
          signerKey: this._identityManager.identity.deviceKey,
          chain: this._identityManager.identity.deviceCredentialChain,
          nonce,
        });
      },
      catch: toServiceError,
    });
  }

  ['IdentityService.createAuthCredential'](): Effect.Effect<Credential, BaseError> {
    return Effect.tryPromise({
      try: async () => {
        const identity = this._identityManager.identity;

        invariant(identity, 'Identity not initialized.');

        return await createCredential({
          assertion: create(AuthSchema, {}),
          issuer: identity.identityKey,
          subject: identity.identityKey,
          chain: identity.deviceCredentialChain,
          signingKey: identity.deviceKey,
          signer: this._keyring,
        });
      },
      catch: toServiceError,
    });
  }

  private '_getIdentity'(): IdentityProto | undefined {
    if (!this._identityManager.identity) {
      return undefined;
    }

    return buf.create(IdentitySchema, {
      did: this._identityManager.identity.did,
      identityKey: fromPublicKey(this._identityManager.identity.identityKey),
      spaceKey: fromPublicKey(this._identityManager.identity.space.key),
      profile: this._identityManager.identity.profileDocument,
    });
  }
}

// The impl is a {@link Resource}; its open/close lifecycle is bound to the layer scope.
export const IdentityServiceLayer = Layer.effect(
  IdentityService.Tag,
  Effect.gen(function* () {
    const identityManager = yield* IdentityContract.ManagerService;
    const recoveryManager = yield* EdgeIdentityRecoveryManagerService;
    const keyring = yield* KeyringApiService;
    const dataSpaceManager = yield* SpacesContract.ManagerService;
    const identityLifecycle = yield* IdentityContract.LifecycleService;
    const runtime = yield* RuntimeProvider.currentRuntime<Hook.Controller>();
    // The stack's own SQLite runtime: the wipe runs under the live stack rather than the reset
    // chain, which tears it down.
    const sqlRuntime = yield* RuntimeProvider.currentRuntime<SqlClient.SqlClient>();
    const service = new IdentityServiceImpl(
      identityManager,
      recoveryManager,
      keyring,
      dataSpaceManager,
      () => RuntimeProvider.runPromise(sqlRuntime)(SqliteStorage.wipeSqliteStorage.pipe(Effect.orDie)),
      (params, ctx) => identityLifecycle.createIdentity(params, ctx),
      (profile) =>
        profile
          ? RuntimeProvider.runPromise(runtime)(Hook.emit(Events.ProfileUpdated, { profile }))
          : Promise.resolve(),
    );
    yield* Effect.acquireRelease(
      Effect.promise(() => service.open()),
      () => Effect.promise(() => service.close()),
    );
    return service;
  }),
);

export const IdentityServiceSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [
      Hook.Controller,
      IdentityContract.ManagerService,
      IdentityContract.LifecycleService,
      EdgeIdentityRecoveryManagerService,
      KeyringApiService,
      SpacesContract.ManagerService,
      SqlClient.SqlClient,
    ],
    provides: [IdentityService.Tag],
  },
  () => IdentityServiceLayer,
);

export const IdentityServiceRegistrationSpec = LayerSpec.make(
  { affinity: 'application', requires: [IdentityService.Tag, RpcRouter.RpcRouter], provides: [], eager: true },
  () => RegisterService(IdentityService.Rpcs, IdentityService.Tag),
);
