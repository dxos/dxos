//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { Context, Resource } from '@dxos/context';
import { createCredential, signPresentation } from '@dxos/credentials';
import { invariant } from '@dxos/invariant';
import { type KeyringApi } from '@dxos/keyring';
import {
  type CreateIdentityRequest,
  type CreateRecoveryCredentialRequest,
  type CreateRecoveryCredentialResponse,
  type Identity as IdentityProto,
  type QueryIdentityResponse,
  type RecoverIdentityRequest,
  type RequestRecoveryChallengeResponse,
  type SignPresentationRequest,
} from '@dxos/protocols/proto/dxos/client/services';
import { type Credential, type Presentation, type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type IdentityService } from '@dxos/protocols/rpc';

import { type Identity } from './identity';
import { type CreateIdentityOptions, type IdentityManager } from './identity-manager';
import { type EdgeIdentityRecoveryManager } from './identity-recovery-manager';

export class IdentityServiceImpl extends Resource implements IdentityService.Handlers {
  'constructor'(
    private readonly _identityManager: IdentityManager,
    private readonly _recoveryManager: EdgeIdentityRecoveryManager,
    private readonly _keyring: KeyringApi,
    private readonly _createIdentity: (params: CreateIdentityOptions, ctx?: Context) => Promise<Identity>,
    private readonly _onProfileUpdate?: (profile: ProfileDocument | undefined) => Promise<void>,
  ) {
    super();
  }

  ['IdentityService.createIdentity'](request: CreateIdentityRequest): Effect.Effect<IdentityProto, Error> {
    return Effect.tryPromise({
      try: async () => {
        const ctx = Context.default();
        await this._createIdentity({ profile: request.profile, deviceProfile: request.deviceProfile }, ctx);
        return this._getIdentity()!;
      },
      catch: (error) => error as Error,
    });
  }

  ['IdentityService.queryIdentity'](): EffectStream.Stream<QueryIdentityResponse, Error> {
    return EffectStream.async<QueryIdentityResponse, Error>((emit) => {
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

  ['IdentityService.updateProfile'](profile: ProfileDocument): Effect.Effect<IdentityProto, Error> {
    return Effect.tryPromise({
      try: async () => {
        invariant(this._identityManager.identity, 'Identity not initialized.');
        await this._identityManager.updateProfile(profile);
        await this._onProfileUpdate?.(this._identityManager.identity.profileDocument);
        return this._getIdentity()!;
      },
      catch: (error) => error as Error,
    });
  }

  ['IdentityService.createRecoveryCredential'](
    request: CreateRecoveryCredentialRequest,
  ): Effect.Effect<CreateRecoveryCredentialResponse, Error> {
    return Effect.tryPromise({
      try: async () => this._recoveryManager.createRecoveryCredential(request),
      catch: (error) => error as Error,
    });
  }

  ['IdentityService.requestRecoveryChallenge'](): Effect.Effect<RequestRecoveryChallengeResponse, Error> {
    return Effect.tryPromise({
      try: async () => this._recoveryManager.requestRecoveryChallenge(Context.default()),
      catch: (error) => error as Error,
    });
  }

  ['IdentityService.recoverIdentity'](request: RecoverIdentityRequest): Effect.Effect<IdentityProto, Error> {
    return Effect.tryPromise({
      try: async () => {
        const ctx = Context.default();
        if (request.recoveryCode) {
          await this._recoveryManager.recoverIdentity(ctx, { recoveryCode: request.recoveryCode });
        } else if (request.external) {
          await this._recoveryManager.recoverIdentityWithExternalSignature(ctx, request.external);
        } else if (request.token) {
          await this._recoveryManager.recoverIdentityWithToken(ctx, { token: request.token });
        } else if (request.recoveryProof) {
          await this._recoveryManager.recoverIdentityWithToken(ctx, { recoveryProof: request.recoveryProof });
        } else {
          throw new Error('Invalid request.');
        }

        return this._getIdentity()!;
      },
      catch: (error) => error as Error,
    });
  }

  // TODO(burdon): Rename createPresentation?
  ['IdentityService.signPresentation'](request: SignPresentationRequest): Effect.Effect<Presentation, Error> {
    return Effect.tryPromise({
      try: async () => {
        const { presentation, nonce } = request;
        invariant(this._identityManager.identity, 'Identity not initialized.');

        return await signPresentation({
          presentation,
          signer: this._keyring,
          signerKey: this._identityManager.identity.deviceKey,
          chain: this._identityManager.identity.deviceCredentialChain,
          nonce,
        });
      },
      catch: (error) => error as Error,
    });
  }

  ['IdentityService.createAuthCredential'](): Effect.Effect<Credential, Error> {
    return Effect.tryPromise({
      try: async () => {
        const identity = this._identityManager.identity;

        invariant(identity, 'Identity not initialized.');

        return await createCredential({
          assertion: { '@type': 'dxos.halo.credentials.Auth' },
          issuer: identity.identityKey,
          subject: identity.identityKey,
          chain: identity.deviceCredentialChain,
          signingKey: identity.deviceKey,
          signer: this._keyring,
        });
      },
      catch: (error) => error as Error,
    });
  }

  private '_getIdentity'(): IdentityProto | undefined {
    if (!this._identityManager.identity) {
      return undefined;
    }

    return {
      did: this._identityManager.identity.did,
      identityKey: this._identityManager.identity.identityKey,
      spaceKey: this._identityManager.identity.space.key,
      profile: this._identityManager.identity.profileDocument,
    };
  }
}
