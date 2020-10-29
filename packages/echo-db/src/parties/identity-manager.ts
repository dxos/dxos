//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { Event, waitForCondition } from '@dxos/async';
import { Keyring, KeyType, Filter } from '@dxos/credentials';

import { PartyInternal } from './party-internal';

const log = debug('dxos:echo:parties:identity-manager');

export class IdentityManager {
  // TODO(telackey): Party here is wrong, or at least incomplete. To build KeyChains and retrieve Identity "genesis"
  // messages, we need the PartyStateMachine, whether directly or indirectly.
  private _halo?: PartyInternal;
  private _initialized = false;

  public readonly ready = new Event<Boolean>();

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

  get displayName () {
    return this.identityInfo?.signed.payload.displayName;
  }

  get deviceKey () {
    return this._keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }));
  }

  get deviceKeyChain () {
    const { halo, deviceKey } = this;
    let keyChain;
    try {
      keyChain = halo && deviceKey ? Keyring.buildKeyChain(
        deviceKey.publicKey,
        halo.processor.credentialMessages,
        halo.processor.feedKeys
      ) : undefined;
    } catch (e) {
      log('Unable to locate device KeyChain.');
    }
    return keyChain;
  }

  get initialized () {
    return this._initialized;
  }

  async initialize (halo: PartyInternal) {
    this._halo = halo;

    // Wait for the minimum set of keys and messages we need for proper function.
    await waitForCondition(() =>
      this._halo &&
      this._halo.processor.memberKeys.length &&
      this.identityGenesis &&
      this.deviceKeyChain
    );

    this._initialized = true;
    this.ready.emit(true);
  }
}
