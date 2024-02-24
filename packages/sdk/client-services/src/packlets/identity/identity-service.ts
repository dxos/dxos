//
// Copyright 2023 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { signPresentation } from '@dxos/credentials';
import { todo } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { type Keyring } from '@dxos/keyring';
import {
  type CreateIdentityRequest,
  type Identity,
  type IdentityService,
  type QueryIdentityResponse,
  type RecoverIdentityRequest,
  type SignPresentationRequest,
} from '@dxos/protocols/proto/dxos/client/services';
import { type Presentation, type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';

import { type CreateIdentityOptions, type IdentityManager } from './identity-manager';

export class IdentityServiceImpl implements IdentityService {
  constructor(
    private readonly _createIdentity: (params: CreateIdentityOptions) => Promise<Identity>,
    private readonly _identityManager: IdentityManager,
    private readonly _keyring: Keyring,
    private readonly _onProfileUpdate?: (profile: ProfileDocument | undefined) => Promise<void>,
  ) {}

  async createIdentity(request: CreateIdentityRequest): Promise<Identity> {
    await this._createIdentity({ displayName: request.profile?.displayName, deviceProfile: request.deviceProfile });
    return this._getIdentity()!;
  }

  async recoverIdentity(request: RecoverIdentityRequest): Promise<Identity> {
    return todo();
  }

  queryIdentity(): Stream<QueryIdentityResponse> {
    return new Stream(({ next }) => {
      const emitNext = () => next({ identity: this._getIdentity() });

      emitNext();
      return this._identityManager.stateUpdate.on(emitNext);
    });
  }

  private _getIdentity(): Identity | undefined {
    if (!this._identityManager.identity) {
      return undefined;
    }

    return {
      identityKey: this._identityManager.identity.identityKey,
      spaceKey: this._identityManager.identity.space.key,
      profile: this._identityManager.identity.profileDocument,
    };
  }

  async updateProfile(profile: ProfileDocument): Promise<Identity> {
    invariant(this._identityManager.identity, 'Identity not initialized.');
    await this._identityManager.updateProfile(profile);
    await this._onProfileUpdate?.(this._identityManager.identity.profileDocument);
    return this._getIdentity()!;
  }

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
}
