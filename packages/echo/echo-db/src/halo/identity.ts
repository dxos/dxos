//
// Copyright 2021 DXOS.org
//

import debug from 'debug';

import { Filter, KeyChain, KeyRecord, Keyring, KeyType } from '@dxos/credentials';

import { HaloParty } from './halo-party';
import { Preferences } from './preferences';
import { ContactManager } from './contact-manager';

const log = debug('dxos:echo:parties:identity');

/**
 * Represents users identity exposing access to signing keys and HALO party.
 *
 * Acts as a read-only view into IdentityManager.
 */
export class Identity {
  private _identityKey?: KeyRecord;

  private _deviceKey?: KeyRecord;
  private _deviceKeyChain?: KeyChain;

  static fromKeyring (keyring: Keyring) {
    return new Identity(
      keyring,
      undefined
    );
  }

  static createFromHalo (keyring: Keyring, halo: HaloParty) {
    const identity = Identity.fromKeyring(keyring);
    identity.setHalo(halo);
    return identity;
  }

  constructor (
    private readonly _keyring: Keyring,
    private _halo: HaloParty | undefined
  ) {}

  get keyring () {
    return this._keyring;
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

  get deviceKeyChain (): KeyChain | undefined {
    if (!this._deviceKeyChain) {
      this._deviceKeyChain = this.deviceKey && this._halo ? getDeviceKeyChainFromHalo(this._halo, this.deviceKey) : undefined;
    }

    return this._deviceKeyChain;
  }

  get halo (): HaloParty | undefined {
    return this._halo;
  }

  get preferences(): Preferences | undefined {
    return this._halo?.preferences;
  }

  get contacts(): ContactManager | undefined {
    return this._halo?.contacts;
  }

  get displayName (): string | undefined {
    return this.identityInfo?.signed.payload.displayName;
  }

  get identityInfo () {
    return this._halo?.identityInfo;
  }

  get identityGenesis () {
    return this._halo?.identityGenesis;
  }

  /**
   * @internal
   *
   * Called by `IdentityManager` when HALO party is initialized.
   */
  setHalo (halo: HaloParty) {
    this._halo = halo;
  }
}

export type IdentityProvider = () => Identity;

function getDeviceKeyChainFromHalo (halo: HaloParty, deviceKey: KeyRecord) {
  try {
    return Keyring.buildKeyChain(
      deviceKey.publicKey,
      halo.credentialMessages,
      halo.feedKeys
    );
  } catch (err) {
    log('Unable to locate device KeyChain:', err); // TODO(burdon): ???
    return undefined;
  }
}
