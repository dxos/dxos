//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Credential, ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';

import { getCredentialAssertion } from '../credentials';
import { CredentialProcessor } from './credential-processor';

export type ProfileStateMachineParams = {
  identityKey: PublicKey;
  onUpdate?: () => void;
}

/**
 * Processes device invitation credentials.
 */
export class ProfileStateMachine implements CredentialProcessor {
  // TODO(burdon): Return values via getter.
  public profile?: ProfileDocument;

  // prettier-ignore
  constructor(
    private readonly _params: ProfileStateMachineParams,
  ) {}

  async process(credential: Credential) {
    const assertion = getCredentialAssertion(credential);
    switch (assertion['@type']) {
      case 'dxos.halo.credentials.IdentityProfile': {
        if (!credential.issuer.equals(this._params.identityKey) || !credential.subject.id.equals(this._params.identityKey)) {
          log.warn('Invalid profile credential', { expectedIdentity: this._params.identityKey, credential });
          return;
        }

        // TODO(dmaretskyi): Extra validation for the credential?
        this.profile = assertion.profile;
        log('updated profile', {
          identityKey: this._params.identityKey,
          profile: this.profile
        });
        this._params.onUpdate?.();
        break;
      }
    }
  }
}
