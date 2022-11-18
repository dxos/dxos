//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Chain, Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { ComplexSet } from '@dxos/util';

import { getCredentialAssertion, isValidAuthorizedDeviceCredential } from '../credentials';

/**
 * Processes device invitation credentials.
 */
export class DeviceStateMachine {
  // TODO(burdon): Return values via getter.
  public readonly authorizedDeviceKeys = new ComplexSet<PublicKey>(PublicKey.hash);
  public readonly deviceChainReady = new Trigger();

  public deviceCredentialChain?: Chain;

  // prettier-ignore
  constructor(
    private readonly _identityKey: PublicKey,
    private readonly _deviceKey: PublicKey
  ) {}

  async process(credential: Credential) {
    log('processing credential...', { identityKey: this._identityKey, deviceKey: this._deviceKey, credential });

    // Save device keychain credential when processed by the space state machine.
    if (isValidAuthorizedDeviceCredential(credential, this._identityKey, this._deviceKey)) {
      this.deviceCredentialChain = { credential };
      this.deviceChainReady.wake();
    }

    const assertion = getCredentialAssertion(credential);
    switch (assertion['@type']) {
      case 'dxos.halo.credentials.AuthorizedDevice': {
        // TODO(dmaretskyi): Extra validation for the credential?
        this.authorizedDeviceKeys.add(assertion.deviceKey);
        log('added device', {
          localDeviceKey: this._deviceKey,
          deviceKey: assertion.deviceKey,
          size: this.authorizedDeviceKeys.size
        });
        break;
      }
    }
  }
}
