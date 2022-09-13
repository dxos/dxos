//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { failUndefined } from '@dxos/debug';
import { TypedMessage } from '@dxos/echo-protocol';
import { Chain, createCredential, Credential, isValidAuthorizedDeviceCredential } from '@dxos/halo-protocol';
import { Signer } from '@dxos/keyring';
import { log } from '@dxos/log';
import { PublicKey } from '@dxos/protocols';
import assert from 'assert';

import { Space, SpaceParams } from '../space';

export type IdentityParams = {
  identityKey: PublicKey
  deviceKey: PublicKey
  signer: Signer

  spaceParams: SpaceParams
}

export type CredentialSignerParams = {
  subject: PublicKey
  assertion: TypedMessage
  nonce?: Uint8Array
}

export type CredentialSigner = (params: CredentialSignerParams) => Promise<Credential>

export class Identity {
  private readonly _signer: Signer;

  private readonly _identityKey: PublicKey;
  private readonly _deviceKey: PublicKey;

  private readonly _halo: Space;

  public readonly ready = new Trigger()

  private _deviceCredentialChain?: Chain;

  constructor ({
    identityKey,
    deviceKey,
    signer,
    spaceParams
  }: IdentityParams) {
    this._signer = signer;
    this._identityKey = identityKey;
    this._deviceKey = deviceKey;

    this._halo = new Space(spaceParams);
    
    // Save device key chain credential when processed by the party state machine.
    this._halo.onCredentialProcessed.set(async credential => {
      log('Credential processed:', credential);
      if(isValidAuthorizedDeviceCredential(credential, this._identityKey, this._deviceKey)) {
        this._deviceCredentialChain = { credential };
        await this.ready.wake();
      };
    });
  }

  async open () {
    await this._halo.open();
  }

  async close () {
    await this._halo.close();
  }

  /**
   * Issues credentials as device.
   */
  getDeviceCredentialSigner (): CredentialSigner {
    return params => createCredential({
      issuer: this._deviceKey,
      keyring: this._signer,

      assertion: params.assertion as any,
      subject: params.subject,
    })
  }

  /**
   * Issues credentials as identity.
   * Requires identity to be ready.
   */
  getIdentityCredentialSigner(): CredentialSigner {
    assert(this._deviceCredentialChain, 'Device credential chain is not ready.');
    return params => createCredential({
      issuer: this._identityKey,
      keyring: this._signer,
      signingKey: this._deviceKey,
      chain: this._deviceCredentialChain ?? failUndefined(),

      assertion: params.assertion as any,
      subject: params.subject,
    })
  }

  get controlMessageWriter() {
    return this._halo.controlMessageWriter;
  }

  get controlPipelineState() {
    return this._halo.controlPipelineState;
  }
}
