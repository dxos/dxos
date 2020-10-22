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

  get identityGenesis () {
    const { halo, identityKey } = this;
    return halo && identityKey ? halo.processor.credentialMessages.get(identityKey.key) : undefined;
  }

  get identityInfo () {
    const { halo, identityKey } = this;
    return halo && identityKey ? halo.processor.infoMessages.get(identityKey.key) : undefined;
  }

  get identityKey () {
    return this._keyring.findKey(Filter.matches({ type: KeyType.IDENTITY, own: true, trusted: true }));
  }

  get deviceKey () {
    return this._keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }));
  }

  get deviceKeyChain () {
    const { halo, deviceKey } = this;
    return halo && deviceKey ? Keyring.buildKeyChain(
      deviceKey.publicKey,
      halo.processor.credentialMessages,
      halo.processor.feedKeys
    ) : undefined;
  }

  get initialized () {
    return !!this._halo;
  }

  async initialize (halo: PartyInternal) {
    this._halo = halo;

    // Wait for the minimum set of keys and messages we need for proper function.
    await waitForCondition(() =>
      halo.processor.memberKeys.length &&
      this.identityGenesis &&
      this.deviceKeyChain
    );
  }
}
