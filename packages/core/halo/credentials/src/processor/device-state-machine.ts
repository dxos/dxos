//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { Trigger } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { toPublicKey } from '@dxos/protocols/buf';
import {
  type Chain,
  ChainSchema,
  type Credential,
  type DeviceProfileDocument,
  DeviceProfileDocumentSchema,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { ComplexMap } from '@dxos/util';

import { getCredentialAssertion, isValidAuthorizedDeviceCredential, subjectIdOf } from '../credentials/index.ts';
import { type CredentialProcessor } from './credential-processor.ts';

export type DeviceStateMachineProps = {
  identityKey: PublicKey;
  deviceKey: PublicKey;
  onUpdate?: () => void;
};

// A device admitted without a profile credential is known but undescribed, which the map holds as
// an empty profile rather than an absent entry.
const emptyDeviceProfile = (): DeviceProfileDocument => create(DeviceProfileDocumentSchema, {});

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
      this.deviceCredentialChain = create(ChainSchema, { credential });
      this.deviceChainReady.wake();
    }

    const assertion = getCredentialAssertion(credential);

    switch (assertion.$typeName) {
      case 'dxos.halo.credentials.AuthorizedDevice': {
        const deviceKey = toPublicKey(assertion.deviceKey);
        invariant(deviceKey, 'Authorized device assertion has no device key.');
        // We don't need to validate that the device is already added since the credentials are considered idempotent.
        // In the future, when we will have device-specific attributes, we should join them from all concurrent credentials.
        this.authorizedDeviceKeys.set(deviceKey, this.authorizedDeviceKeys.get(deviceKey) ?? emptyDeviceProfile());

        log('added device', {
          localDeviceKey: this._params.deviceKey,
          deviceKey,
          size: this.authorizedDeviceKeys.size,
        });
        this._params.onUpdate?.();
        break;
      }

      case 'dxos.halo.credentials.DeviceProfile': {
        const deviceKey = subjectIdOf(credential);
        invariant(this.authorizedDeviceKeys.has(deviceKey), 'Device not found.');

        if (deviceKey.equals(this._params.deviceKey)) {
          log.trace('dxos.halo.device', {
            deviceKey,
            profile: assertion.profile,
          });
        }

        this.authorizedDeviceKeys.set(deviceKey, assertion.profile ?? emptyDeviceProfile());
        this._params.onUpdate?.();
        break;
      }
    }
  }
}
