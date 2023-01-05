//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Chain, Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { ComplexSet } from '@dxos/util';

import { getCredentialAssertion, isValidAuthorizedDeviceCredential } from '../credentials';
import { CredentialProcessor } from './credential-processor';

export type DeviceStateMachineParams = {
  identityKey: PublicKey;
  deviceKey: PublicKey;
  onUpdate?: () => void;
}

/**
 * Processes device invitation credentials.
 */
export class DeviceStateMachine implements CredentialProcessor {
  // TODO(burdon): Return values via getter.
  public readonly authorizedDeviceKeys = new ComplexSet<PublicKey>(PublicKey.hash);
  public readonly deviceChainReady = new Trigger();

  public deviceCredentialChain?: Chain;

  // prettier-ignore
  constructor(
    private readonly _params: DeviceStateMachineParams,
  ) {}

  async process(credential: Credential) {
    log('processing credential...', { identityKey: this._params.identityKey, deviceKey: this._params.deviceKey, credential });

    // Save device keychain credential when processed by the space state machine.
    if (isValidAuthorizedDeviceCredential(credential, this._params.identityKey, this._params.deviceKey)) {
      this.deviceCredentialChain = { credential };
      this.deviceChainReady.wake();
    }

    const assertion = getCredentialAssertion(credential);
    switch (assertion['@type']) {
      case 'dxos.halo.credentials.AuthorizedDevice': {
        // TODO(dmaretskyi): Extra validation for the credential?
        this.authorizedDeviceKeys.add(assertion.deviceKey);
        log('added device', {
          localDeviceKey: this._params.deviceKey,
          deviceKey: assertion.deviceKey,
          size: this.authorizedDeviceKeys.size
        });
        this._params.onUpdate?.();
        break;
      }
    }
  }
}
