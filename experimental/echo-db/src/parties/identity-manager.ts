//
// Copyright 2020 DXOS.org
//

import { Keyring, KeyType, Filter } from '@dxos/credentials';

import { Party } from './party';

// TODO(telackey) @dxos/credentials was only half converted to TS. In its current state, the KeyRecord type
// Aliasing to 'any' is a workaround for the compiler, but the fix is fully to convert @dxos/credentials to TS.
export type KeyRecord = any;

export class IdentityManager {
  // TODO(telackey): Party here is wrong, or at least incomplete. To build KeyChains and retrieve Identity "genesis"
  // messages, we need the PartyStateMachine, whether directly or indirectly.
  private _halo?: Party;

  constructor (
    private readonly _keyring: Keyring
  ) {}

  get halo () {
    return this._halo;
  }

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

  async initialize (halo: Party) {
    this._halo = halo;
  }
}
