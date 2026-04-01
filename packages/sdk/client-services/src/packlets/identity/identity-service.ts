//
// Copyright 2023 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf/stream';
import { Resource } from '@dxos/context';
import { createCredential, signPresentation } from '@dxos/credentials';
import { invariant } from '@dxos/invariant';
import { type Keyring } from '@dxos/keyring';
import {
  type CreateIdentityRequest,
  type CreateRecoveryCredentialRequest,
  type Identity as IdentityProto,
  type IdentityService,
  type QueryIdentityResponse,
  type RecoverIdentityRequest,
  type SignPresentationRequest,
} from '@dxos/protocols/proto/dxos/client/services';
import { type Presentation, type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';

import { type Identity } from './identity';
import { type CreateIdentityOptions, type IdentityManager } from './identity-manager';
import { type EdgeIdentityRecoveryManager } from './identity-recovery-manager';

export class IdentityServiceImpl extends Resource implements IdentityService {
  constructor(
    private readonly _identityManager: IdentityManager,
    private readonly _recoveryManager: EdgeIdentityRecoveryManager,
    private readonly _keyring: Keyring,
    private readonly _createIdentity: (params: CreateIdentityOptions) => Promise<Identity>,
    private readonly _onProfileUpdate?: (profile: ProfileDocument | undefined) => Promise<void>,
  ) {
    super();
  }

  async createIdentity(request: CreateIdentityRequest): Promise<IdentityProto> {
    await this._createIdentity({ profile: request.profile, deviceProfile: request.deviceProfile });
    return this._getIdentity()!;
  }

  queryIdentity(): Stream<QueryIdentityResponse> {
    return new Stream(({ next }) => {
      const emitNext = () => next({ identity: this._getIdentity() });

      emitNext();
      return this._identityManager.stateUpdate.on(emitNext);
    });
  }

  private _getIdentity(): IdentityProto | undefined {
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

  async updateProfile(profile: ProfileDocument): Promise<IdentityProto> {
    invariant(this._identityManager.identity, 'Identity not initialized.');
    await this._identityManager.updateProfile(profile);
    await this._onProfileUpdate?.(this._identityManager.identity.profileDocument);
    return this._getIdentity()!;
  }

  async createRecoveryCredential(request: CreateRecoveryCredentialRequest) {
    return this._recoveryManager.createRecoveryCredential(request);
  }

  async requestRecoveryChallenge() {
    return this._recoveryManager.requestRecoveryChallenge();
  }

  async recoverIdentity(request: RecoverIdentityRequest): Promise<IdentityProto> {
    if (request.recoveryCode) {
      await this._recoveryManager.recoverIdentity({ recoveryCode: request.recoveryCode });
    } else if (request.external) {
      await this._recoveryManager.recoverIdentityWithExternalSignature(request.external);
    } else if (request.token) {
      await this._recoveryManager.recoverIdentityWithToken({ token: request.token });
    } else {
      throw new Error('Invalid request.');
    }

    return this._getIdentity()!;
  }

  // TODO(burdon): Rename createPresentation?
  async signPresentation({ presentation, nonce }: SignPresentationRequest): Promise<Presentation> {
    invariant(this._identityManager.identity, 'Identity not initialized.');

    return await signPresentation({
      presentation,
      signer: this._keyring,
      signerKey: this._identityManager.identity.deviceKey,
      chain: this._identityManager.identity.deviceCredentialChain,
      nonce,
    });
  }

  async createAuthCredential() {
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
  }
}
