//
// Copyright 2020 DXOS.org
//

import { Keyring, KeyType, Filter } from '@dxos/credentials';

import { PartyInternal } from './party-internal';

export class IdentityManager {
  // TODO(telackey): Party here is wrong, or at least incomplete. To build KeyChains and retrieve Identity "genesis"
  // messages, we need the PartyStateMachine, whether directly or indirectly.
  private _halo?: PartyInternal;

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

  get initialized () {
    return !!this._halo;
  }

  async initialize (halo: PartyInternal) {
    this._halo = halo;
  }
}
