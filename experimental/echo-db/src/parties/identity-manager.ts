//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Keyring, KeyType } from '@dxos/credentials';

import { Party } from './party';

// TODO(telackey) @dxos/credentials was only half converted to TS. In its current state, the KeyRecord type
// Aliasing to 'any' is a workaround for the compiler, but the fix is fully to convert @dxos/credentials to TS.
type KeyRecord = any;

export class IdentityManager {
  private readonly _keyring: Keyring;
  private _identityKey?: KeyRecord;
  private _deviceKey?: KeyRecord;

  constructor (keyring: Keyring) {
    this._keyring = keyring;
  }

  get keyring () {
    return this._keyring;
  }

  get identityKey () {
    return this._identityKey;
  }

  // TODO(telackey): port DeviceManager?
  get deviceKey () {
    return this._deviceKey;
  }

  async initIdentity () {
    assert(!this.identityKey, 'IDENTITY key already exists.');
    assert(!this.deviceKey, 'DEVICE key already exists.');

    // 1. Create an IDENTITY key.
    this._identityKey = await this._keyring.createKeyRecord({ type: KeyType.IDENTITY });
    // 2. Create a DEVICE key.
    this._deviceKey = await this._keyring.createKeyRecord({ type: KeyType.DEVICE });
  }
}
