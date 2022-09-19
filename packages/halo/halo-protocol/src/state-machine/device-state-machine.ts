//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { PublicKey } from '@dxos/protocols';
import { ComplexSet } from '@dxos/util';
import { Chain, Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

import { getCredentialAssertion, isValidAuthorizedDeviceCredential } from '../credentials';

/**
 * Processes device invitation credentials.
 */
export class DeviceStateMachine {
  public readonly authorizedDeviceKeys = new ComplexSet<PublicKey>(key => key.toHex());
  public readonly deviceChainReady = new Trigger();
  public deviceCredentialChain?: Chain;

  constructor (
    private readonly _identityKey: PublicKey,
    private readonly _deviceKey: PublicKey
  ) {}

  async process (credential: Credential) {
    log('Credential processed:', credential);

    // Save device key chain credential when processed by the party state machine.
    if (isValidAuthorizedDeviceCredential(credential, this._identityKey, this._deviceKey)) {
      this.deviceCredentialChain = { credential };
      this.deviceChainReady.wake();
    }

    const assertion = getCredentialAssertion(credential);
    switch (assertion['@type']) {
      case 'dxos.halo.credentials.AuthorizedDevice':
        // TODO(dmaretskyi): Extra validation for the credential?
        this.authorizedDeviceKeys.add(assertion.deviceKey);
        break;
    }
  }
}
