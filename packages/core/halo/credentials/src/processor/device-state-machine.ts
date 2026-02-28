//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { create, toPublicKey } from '@dxos/protocols/buf';
import {
  type Chain,
  ChainSchema,
  type Credential,
  type DeviceProfileDocument,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { ComplexMap } from '@dxos/util';

import { fromBufPublicKey, getCredentialAssertion, isValidAuthorizedDeviceCredential } from '../credentials';

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
      // Avoid create(ChainSchema, { credential }) which deep-processes the credential
      // and strips @dxos/keys.PublicKey instances from proto-decoded credentials.
      const chain = create(ChainSchema, {});
      chain.credential = credential;
      this.deviceCredentialChain = chain;
      this.deviceChainReady.wake();
    }

    const assertion = getCredentialAssertion(credential);
    const subjectId = fromBufPublicKey(credential.subject!.id!)!;

    switch (assertion.$typeName) {
      case 'dxos.halo.credentials.AuthorizedDevice': {
        const deviceKey = assertion.deviceKey ? toPublicKey(assertion.deviceKey) : subjectId;
        this.authorizedDeviceKeys.set(deviceKey, this.authorizedDeviceKeys.get(deviceKey) ?? ({} as DeviceProfileDocument));

        log('added device', {
          localDeviceKey: this._params.deviceKey,
          deviceKey,
          size: this.authorizedDeviceKeys.size,
        });
        this._params.onUpdate?.();
        break;
      }

      case 'dxos.halo.credentials.DeviceProfile': {
        invariant(this.authorizedDeviceKeys.has(subjectId), 'Device not found.');

        if (assertion && subjectId.equals(this._params.deviceKey)) {
          log.trace('dxos.halo.device', {
            deviceKey: subjectId,
            profile: assertion.profile,
          });
        }

        this.authorizedDeviceKeys.set(subjectId, assertion.profile ?? ({} as DeviceProfileDocument));
        this._params.onUpdate?.();
        break;
      }
    }
  }
}
