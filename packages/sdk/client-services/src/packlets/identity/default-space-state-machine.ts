//
// Copyright 2022 DXOS.org
//

import { type CredentialProcessor, getCredentialAssertion } from '@dxos/credentials';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

type DefaultSpaceStateMachineParams = {
  identityKey: PublicKey;
  onUpdate?: () => void;
};

/**
 * Processes device invitation credentials.
 */
export class DefaultSpaceStateMachine implements CredentialProcessor {
  private _spaceKey: PublicKey | undefined;

  constructor(private readonly _params: DefaultSpaceStateMachineParams) {}

  public get spaceKey(): PublicKey | undefined {
    return this._spaceKey;
  }

  async processCredential(credential: Credential) {
    const assertion = getCredentialAssertion(credential);
    switch (assertion['@type']) {
      case 'dxos.halo.credentials.DefaultSpace': {
        if (!credential.subject.id.equals(this._params.identityKey)) {
          log.warn('Invalid default space credential', { expectedIdentity: this._params.identityKey, credential });
          return;
        }
        this._spaceKey = assertion.spaceKey;
        break;
      }
    }
  }
}
