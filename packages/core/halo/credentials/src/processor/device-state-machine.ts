//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Chain, Credential, ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { ComplexMap } from '@dxos/util';

import { CredentialProcessor } from './credential-processor';
import { getCredentialAssertion, isValidAuthorizedDeviceCredential } from '../credentials';

export type DeviceStateMachineParams = {
  identityKey: PublicKey;
  deviceKey: PublicKey;
  onUpdate?: () => void;
};

/**
 * Processes device invitation credentials.
 */
export class DeviceStateMachine implements CredentialProcessor {
  // TODO(burdon): Return values via getter.
  public readonly authorizedDeviceKeys = new ComplexMap<PublicKey, ProfileDocument>(PublicKey.hash);

  public readonly deviceChainReady = new Trigger();

  public deviceCredentialChain?: Chain;

  constructor(private readonly _params: DeviceStateMachineParams) {}

  async processCredential(credential: Credential) {
    log('processing credential...', {
      identityKey: this._params.identityKey,
      deviceKey: this._params.deviceKey,
      credential,
    });

    // Save device keychain credential when processed by the space state machine.
    if (isValidAuthorizedDeviceCredential(credential, this._params.identityKey, this._params.deviceKey)) {
      this.deviceCredentialChain = { credential };
      this.deviceChainReady.wake();
    }

    const assertion = getCredentialAssertion(credential);

    switch (assertion['@type']) {
      case 'dxos.halo.credentials.AuthorizedDevice': {
        invariant(!this.authorizedDeviceKeys.has(assertion.deviceKey), 'Device already added.');
        // TODO(dmaretskyi): Extra validation for the credential?
        this.authorizedDeviceKeys.set(assertion.deviceKey, {});
        log('added device', {
          localDeviceKey: this._params.deviceKey,
          deviceKey: assertion.deviceKey,
          size: this.authorizedDeviceKeys.size,
        });
        this._params.onUpdate?.();
        break;
      }
      case 'dxos.halo.credentials.DeviceProfile': {
        invariant(this.authorizedDeviceKeys.has(assertion.deviceKey), 'Device not found.');

        if (assertion && assertion.deviceKey.equals(this._params.deviceKey)) {
          log.trace('dxos.halo.device', {
            deviceKey: assertion.deviceKey,
            deviceName: assertion.profile?.displayName,
          });
        }

        this.authorizedDeviceKeys.set(assertion.deviceKey, assertion.profile);
        this._params.onUpdate?.();
        break;
      }
    }
  }
}
