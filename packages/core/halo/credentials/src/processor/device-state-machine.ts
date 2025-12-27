//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Chain, type Credential, type DeviceProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { ComplexMap } from '@dxos/util';

import { getCredentialAssertion, isValidAuthorizedDeviceCredential } from '../credentials';

import { type CredentialProcessor } from './credential-processor';

export type DeviceStateMachineProps = {
  identityKey: PublicKey;
  deviceKey: PublicKey;
  onUpdate?: () => void;
};

/**
 * Processes device invitation credentials.
 */
export class DeviceStateMachine implements CredentialProcessor {
  // TODO(burdon): Return values via getter.
  public readonly authorizedDeviceKeys = new ComplexMap<PublicKey, DeviceProfileDocument>(PublicKey.hash);

  public readonly deviceChainReady = new Trigger();

  public deviceCredentialChain?: Chain;

  constructor(private readonly _params: DeviceStateMachineProps) {}

  async processCredential(credential: Credential): Promise<void> {
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
        // We don't need to validate that the device is already added since the credentials are considered idempotent.
        // In the future, when we will have device-specific attributes, we should join them from all concurrent credentials.
        this.authorizedDeviceKeys.set(assertion.deviceKey, this.authorizedDeviceKeys.get(assertion.deviceKey) ?? {});

        log('added device', {
          localDeviceKey: this._params.deviceKey,
          deviceKey: assertion.deviceKey,
          size: this.authorizedDeviceKeys.size,
        });
        this._params.onUpdate?.();
        break;
      }

      case 'dxos.halo.credentials.DeviceProfile': {
        invariant(this.authorizedDeviceKeys.has(credential.subject.id), 'Device not found.');

        if (assertion && credential.subject.id.equals(this._params.deviceKey)) {
          log.trace('dxos.halo.device', {
            deviceKey: credential.subject.id,
            profile: assertion.profile,
          });
        }

        this.authorizedDeviceKeys.set(credential.subject.id, assertion.profile);
        this._params.onUpdate?.();
        break;
      }
    }
  }
}
