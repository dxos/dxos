//
// Copyright 2021 DXOS.org
//

import debug from 'debug';

import { Filter, KeyChain, KeyRecord, Keyring, KeyType, SignedMessage } from '@dxos/credentials';

import { HaloParty } from './halo-party';

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

  constructor (
    private readonly _keyring: Keyring,
    private readonly _halo: HaloParty | undefined
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

  get deviceKeyChain () {
    if (!this._deviceKeyChain) {
      const deviceKey = this.deviceKey;
      try {
        this._deviceKeyChain = (this._halo && deviceKey) ? Keyring.buildKeyChain(
          deviceKey.publicKey,
          this._halo.credentialMessages,
          this._halo.feedKeys
        ) : undefined;
      } catch (err) {
        log('Unable to locate device KeyChain:', err); // TODO(burdon): ???
      }
    }

    return this._deviceKeyChain;
  }

  get halo (): HaloParty | undefined {
    return this._halo;
  }

  get displayName (): string | undefined {
    return this._halo?.identityInfo?.signed.payload.displayName;
  }

  get identityInfo (): SignedMessage | undefined {
    return this._halo?.identityInfo;
  }

  get identityGenesis (): SignedMessage | undefined {
    return this._halo?.identityGenesis;
  }
}

export type IdentityProvider = () => Identity;
