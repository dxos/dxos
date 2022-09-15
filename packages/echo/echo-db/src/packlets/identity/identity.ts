//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { DeviceStateMachine } from '@dxos/halo-protocol';
import { Signer } from '@dxos/keyring';
import { PublicKey } from '@dxos/protocols';

import { Space } from '../space';
import { createChainCredentialSigner, createKeyCredentialSigner, CredentialSigner } from './credential-signer';


export type IdentityParams = {
  identityKey: PublicKey
  deviceKey: PublicKey
  signer: Signer
  space: Space
}

export class Identity {
  private readonly _identityKey: PublicKey;
  private readonly _deviceKey: PublicKey;
  private readonly _signer: Signer;
  private readonly _halo: Space;
  private readonly _deviceStateMachine: DeviceStateMachine;

  constructor ({
    identityKey,
    deviceKey,
    signer,
    space
  }: IdentityParams) {
    this._identityKey = identityKey;
    this._deviceKey = deviceKey;
    this._signer = signer;
    this._halo = space; // TODO(burdon): Rename space.
    this._deviceStateMachine = new DeviceStateMachine(this._identityKey, this._deviceKey)

    // TODO(burdon): Unbind on destroy? (Pattern).
    // Save device key chain credential when processed by the party state machine.
    this._halo.onCredentialProcessed.set(async credential => {
      await this._deviceStateMachine.process(credential);
    });
  }

  async open () {
    await this._halo.open();
  }

  async close () {
    await this._halo.close();
  }

  async ready() {
    await this._deviceStateMachine.deviceChainReady.wait();
  }

  /**
   * Issues credentials as device.
   */
  getDeviceCredentialSigner (): CredentialSigner {
    return createKeyCredentialSigner(this._signer, this._deviceKey);
  }

  /**
   * Issues credentials as identity.
   * Requires identity to be ready.
   */
  getIdentityCredentialSigner (): CredentialSigner {
    assert(this._deviceStateMachine.deviceCredentialChain, 'Device credential chain is not ready.');
    return createChainCredentialSigner(this._signer, this._deviceStateMachine.deviceCredentialChain, this._deviceKey);
  }

  get controlMessageWriter () {
    return this._halo.controlMessageWriter;``
  }

  get controlPipelineState () {
    return this._halo.controlPipelineState;
  }
}
