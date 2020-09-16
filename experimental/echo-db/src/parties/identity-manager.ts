//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Keyring, KeyType, Filter } from '@dxos/credentials';

import { Party } from './party';
import { PartyManager } from './party-manager';

// TODO(telackey) @dxos/credentials was only half converted to TS. In its current state, the KeyRecord type
// Aliasing to 'any' is a workaround for the compiler, but the fix is fully to convert @dxos/credentials to TS.
export type KeyRecord = any;

export class IdentityManager {
  private _halo?: Party;

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

  get initialized () {
    return !!this._halo;
  }

  async createKeys () {
    // TODO(telackey): IdentityManager shouldn't create Identity keys. They have an external origin.
    await this._keyring.createKeyRecord({ type: KeyType.IDENTITY });
    await this._keyring.createKeyRecord({ type: KeyType.DEVICE });
  }

  async initialize (halo: Party) {
    this._halo = halo;
  }
}
