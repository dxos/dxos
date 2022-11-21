//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Credential, ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';

import { getCredentialAssertion } from '../credentials';

/**
 * Processes device invitation credentials.
 */
export class ProfileStateMachine {
  // TODO(burdon): Return values via getter.
  public profile?: ProfileDocument;

  // prettier-ignore
  constructor(
    private readonly _identityKey: PublicKey
  ) {}

  async process(credential: Credential) {
    const assertion = getCredentialAssertion(credential);
    switch (assertion['@type']) {
      case 'dxos.halo.credentials.IdentityProfile': {
        if (!credential.issuer.equals(this._identityKey) || !credential.subject.id.equals(this._identityKey)) {
          log.warn('Invalid profile credential', { expectedIdentity: this._identityKey, credential });
          return;
        }

        // TODO(dmaretskyi): Extra validation for the credential?
        this.profile = assertion.profile;
        log('updated profile', {
          identityKey: this._identityKey,
          profile: this.profile
        });
        break;
      }
    }
  }
}
