//
// Copyright 2022 DXOS.org
//

import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Credential, type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';

import { getCredentialAssertion } from '../credentials';

import { type CredentialProcessor } from './credential-processor';

export type ProfileStateMachineProps = {
  identityKey: PublicKey;
  onUpdate?: () => void;
};

/**
 * Processes device invitation credentials.
 */
export class ProfileStateMachine implements CredentialProcessor {
  // TODO(burdon): Return values via getter.
  public profile?: ProfileDocument;

  constructor(private readonly _params: ProfileStateMachineProps) {}

  async processCredential(credential: Credential): Promise<void> {
    const assertion = getCredentialAssertion(credential);
    switch (assertion['@type']) {
      case 'dxos.halo.credentials.IdentityProfile': {
        if (
          !credential.issuer.equals(this._params.identityKey) ||
          !credential.subject.id.equals(this._params.identityKey)
        ) {
          log.warn('Invalid profile credential', { expectedIdentity: this._params.identityKey, credential });
          return;
        }

        // TODO(dmaretskyi): Extra validation for the credential?
        this.profile = assertion.profile;
        log('updated profile', {
          identityKey: this._params.identityKey,
          profile: this.profile,
        });
        this._params.onUpdate?.();
        break;
      }
    }
  }
}
