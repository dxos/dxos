//
// Copyright 2020 DXOS.org
//

import { waitForCondition } from '@dxos/async';
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
    // TODO(telackey): We should wait for the Device key too, once we have multi-device,
    // and Identity/DeviceInfo messages if we make them mandatory.
    // Wait for the Identity key to be processed; it will be the first one.
    await waitForCondition(() => halo.processor.memberKeys.length);
  }
}
