//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Trigger } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import { TypedMessage } from '@dxos/echo-protocol';
import { Chain, createCredential, Credential, DeviceStateMachine, getCredentialAssertion, isValidAuthorizedDeviceCredential } from '@dxos/halo-protocol';
import { Signer } from '@dxos/keyring';
import { log } from '@dxos/log';
import { PublicKey } from '@dxos/protocols';

import { Space } from '../space';
import { ComplexSet } from '@dxos/util';

export type CredentialSignerParams = {
  subject: PublicKey
  assertion: TypedMessage
  nonce?: Uint8Array
}

export type CredentialSigner = (params: CredentialSignerParams) => Promise<Credential>

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
    return params => createCredential({
      issuer: this._deviceKey,
      keyring: this._signer,

      assertion: params.assertion as any,
      subject: params.subject
    });
  }

  /**
   * Issues credentials as identity.
   * Requires identity to be ready.
   */
  getIdentityCredentialSigner (): CredentialSigner {
    assert(this._deviceStateMachine.deviceCredentialChain, 'Device credential chain is not ready.');
    return params => createCredential({
      issuer: this._identityKey,
      keyring: this._signer,
      signingKey: this._deviceKey,
      chain: this._deviceStateMachine.deviceCredentialChain ?? failUndefined(),

      assertion: params.assertion as any,
      subject: params.subject
    });
  }

  get controlMessageWriter () {
    return this._halo.controlMessageWriter;``
  }

  get controlPipelineState () {
    return this._halo.controlPipelineState;
  }
}
