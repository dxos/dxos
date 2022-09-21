//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import {
  CredentialSigner, DeviceStateMachine, createCredentialSignerWithChain, createCredentialSignerWithKey
} from '@dxos/halo-protocol';
import { Signer } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';

import { Space } from '../space';
import { Database } from '../database';
import { failUndefined } from '@dxos/debug';

export type IdentityParams = {
  identityKey: PublicKey
  deviceKey: PublicKey
  signer: Signer
  space: Space
}

export class Identity {
  public readonly identityKey: PublicKey;
  public readonly deviceKey: PublicKey;

  private readonly _signer: Signer;
  private readonly _halo: Space;
  private readonly _deviceStateMachine: DeviceStateMachine;

  constructor ({
    identityKey,
    deviceKey,
    signer,
    space
  }: IdentityParams) {
    this.identityKey = identityKey;
    this.deviceKey = deviceKey;
    this._signer = signer;
    this._halo = space; // TODO(burdon): Rename space.
    this._deviceStateMachine = new DeviceStateMachine(this.identityKey, this.deviceKey);

    // TODO(burdon): Unbind on destroy? (Pattern).
    // Save device key chain credential when processed by the party state machine.
    this._halo.onCredentialProcessed.set(async credential => {
      await this._deviceStateMachine.process(credential);
    });
  }

  // TODO(burdon): Expose state object?
  get authorizedDeviceKeys () {
    return this._deviceStateMachine.authorizedDeviceKeys;
  }

  async open () {
    await this._halo.open();
  }

  async close () {
    await this._halo.close();
  }

  async ready () {
    await this._deviceStateMachine.deviceChainReady.wait();

    // TODO(dmaretskyi): Should we also wait for our feeds to be admitted?
  }

  /**
   * @test-only
   */
  get controlPipeline () {
    return this._halo.controlPipeline;
  }

  get haloSpaceKey () {
    return this._halo.key;
  }

  get haloGenesisFeedKey () {
    return this._halo.genesisFeedKey;
  }

  get haloDatabase(): Database {
    return this._halo.database ?? failUndefined();
  }

  /**
   * Issues credentials as identity.
   * Requires identity to be ready.
   */
  getIdentityCredentialSigner (): CredentialSigner {
    assert(this._deviceStateMachine.deviceCredentialChain, 'Device credential chain is not ready.');
    return createCredentialSignerWithChain(this._signer, this._deviceStateMachine.deviceCredentialChain, this.deviceKey);
  }

  /**
   * Issues credentials as device.
   */
  getDeviceCredentialSigner (): CredentialSigner {
    return createCredentialSignerWithKey(this._signer, this.deviceKey);
  }
}
