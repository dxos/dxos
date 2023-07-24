//
// Copyright 2023 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { signPresentation } from '@dxos/credentials';
import { todo } from '@dxos/debug';
import { invariant } from '@dxos/log';
import {
  Identity,
  IdentityService,
  QueryIdentityResponse,
  RecoverIdentityRequest,
  SignPresentationRequest,
} from '@dxos/protocols/proto/dxos/client/services';
import { Presentation, ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';

import { ServiceContext } from '../services';

export class IdentityServiceImpl implements IdentityService {
  // TODO(wittjosiah): Remove dependency on service context.
  constructor(private readonly _serviceContext: ServiceContext) {}

  async createIdentity(request: ProfileDocument): Promise<Identity> {
    await this._serviceContext.createIdentity(request);

    return this._getIdentity()!;
  }

  async recoverIdentity(request: RecoverIdentityRequest): Promise<Identity> {
    return todo();
  }

  queryIdentity(): Stream<QueryIdentityResponse> {
    return new Stream(({ next }) => {
      const emitNext = () => next({ identity: this._getIdentity() });

      emitNext();
      return this._serviceContext.identityManager.stateUpdate.on(emitNext);
    });
  }

  private _getIdentity(): Identity | undefined {
    if (!this._serviceContext.identityManager.identity) {
      return undefined;
    }

    return {
      identityKey: this._serviceContext.identityManager.identity.identityKey,
      spaceKey: this._serviceContext.identityManager.identity.space.key,
      profile: this._serviceContext.identityManager.identity.profileDocument,
    };
  }

  async signPresentation({ presentation, nonce }: SignPresentationRequest): Promise<Presentation> {
    invariant(this._serviceContext.identityManager.identity, 'Identity not initialized.');

    return await signPresentation({
      presentation,
      signer: this._serviceContext.keyring,
      signerKey: this._serviceContext.identityManager.identity.deviceKey,
      chain: this._serviceContext.identityManager.identity.deviceCredentialChain,
      nonce,
    });
  }
}
