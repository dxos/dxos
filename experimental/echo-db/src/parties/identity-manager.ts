//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Keyring, KeyType, Filter } from '@dxos/credentials';

import { Party } from './party';

// TODO(telackey) @dxos/credentials was only half converted to TS. In its current state, the KeyRecord type
// Aliasing to 'any' is a workaround for the compiler, but the fix is fully to convert @dxos/credentials to TS.
type KeyRecord = any;

export class IdentityManager {
  constructor (
    private readonly _keyring: Keyring
  ) {}

  get keyring () {
    return this._keyring;
  }

  get identityKey () {
    return this._keyring.findKey(Filter.matches({ type: KeyType.IDENTITY, own: true, trusted: true }));
  }

  // TODO(telackey): port DeviceManager?
  get deviceKey () {
    return this._keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }));
  }

  // TODO(telackey): IdentityManager shouldn't create Identity keys.
  async initIdentity () {
    assert(!this.identityKey, 'IDENTITY key already exists.');
    assert(!this.deviceKey, 'DEVICE key already exists.');

    await this._keyring.createKeyRecord({ type: KeyType.IDENTITY });
    await this._keyring.createKeyRecord({ type: KeyType.DEVICE });
  }
}
