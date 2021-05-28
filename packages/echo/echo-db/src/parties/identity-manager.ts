//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Event, waitForCondition } from '@dxos/async';
import { Keyring, KeyChain, KeyType, Filter, KeyRecord } from '@dxos/credentials';

import { HaloParty } from './halo-party';
import { PartyInternal } from './party-internal';

const log = debug('dxos:echo:parties:identity-manager');

/**
 * Manages the keyring and HALO party.
 */
export class IdentityManager {
  private _halo?: HaloParty;
  private _identityKey?: KeyRecord;
  private _deviceKey?: KeyRecord;
  private _deviceKeyChain?: KeyChain;

  public readonly ready = new Event();

  constructor (
    private readonly _keyring: Keyring
  ) {}

  get keyring () {
    return this._keyring;
  }

  get initialized () {
    return !!this._halo;
  }

  get halo () {
    return this._halo;
  }

  get identityInfo () {
    return this.halo?.identityInfo;
  }

  get identityGenesis () {
    return this.halo?.identityGenesis;
  }

  get displayName () {
    return this.identityInfo?.signed.payload.displayName;
  }

  get identityKey (): KeyRecord | undefined {
    if (!this._identityKey) {
      this._identityKey = this._keyring.findKey(Filter.matches({ type: KeyType.IDENTITY, own: true, trusted: true }));
    }

    return this._identityKey;
  }

  get deviceKey (): KeyRecord | undefined {
    if (!this._deviceKey) {
      this._deviceKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }));
    }

    return this._deviceKey;
  }

  get deviceKeyChain () {
    if (!this._deviceKeyChain) {
      const { halo, deviceKey } = this;
      try {
        this._deviceKeyChain = halo && deviceKey ? Keyring.buildKeyChain(
          deviceKey.publicKey,
          halo.credentialMessages,
          halo.feedKeys
        ) : undefined;
      } catch (e) {
        log('Unable to locate device KeyChain.');
      }
    }

    return this._deviceKeyChain;
  }

  async initialize (halo: PartyInternal) {
    assert(this._identityKey, 'No identity key.');
    assert(this._deviceKey, 'No device key.');

    this._halo = new HaloParty(halo, this._identityKey.publicKey, this._deviceKey.publicKey);

    // Wait for the minimum set of keys and messages we need for proper function.
    await waitForCondition(() =>
      this._halo!.memberKeys.length &&
      this.identityGenesis &&
      this.deviceKeyChain
    );

    this.ready.emit();
  }
}
