//
// Copyright 2022 DXOS.org
//

import { type CredentialProcessor, getCredentialAssertion } from '@dxos/credentials';
import { type PublicKey, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

type DefaultSpaceStateMachineProps = {
  identityKey: PublicKey;
  onUpdate?: () => void;
};

/**
 * Processes device invitation credentials.
 */
export class DefaultSpaceStateMachine implements CredentialProcessor {
  private _spaceId: SpaceId | undefined;

  constructor(private readonly _params: DefaultSpaceStateMachineProps) {}

  public get spaceId(): SpaceId | undefined {
    return this._spaceId;
  }

  async processCredential(credential: Credential): Promise<void> {
    const assertion = getCredentialAssertion(credential);
    switch (assertion['@type']) {
      case 'dxos.halo.credentials.DefaultSpace': {
        if (!credential.subject.id.equals(this._params.identityKey)) {
          log.warn('Invalid default space credential', { expectedIdentity: this._params.identityKey, credential });
          return;
        }
        if (!SpaceId.isValid(assertion.spaceId)) {
          log.warn('Invalid default space id', { id: assertion.spaceId });
          return;
        }
        this._spaceId = assertion.spaceId;
        break;
      }
    }
  }
}
