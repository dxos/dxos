//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Filter, KeyChain, KeyRecord, Keyring, KeyType, SignedMessage, Signer } from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';

import { CredentialsSigner } from '../protocol/credentials-signer';
import { IdentityCredentials } from '../protocol/identity-credentials';
import { ContactManager } from './contact-manager';
import { HaloParty } from './halo-party';
import { Preferences } from './preferences';

const log = debug('dxos:echo-db:identity');

/**
 * Represents users identity exposing access to signing keys and HALO party.
 *
 * Acts as a read-only view into IdentityManager.
 */
export class Identity implements IdentityCredentials {
  private readonly _identityKey: KeyRecord;
  private readonly _deviceKey: KeyRecord;
  private readonly _deviceKeyChain: KeyChain;

  /**
   * @param _halo HALO party. Must be open.
   */
  constructor (
    private readonly _keyring: Keyring,
    private readonly _halo: HaloParty
  ) {
    this._identityKey = this._keyring.findKey(Filter.matches({ type: KeyType.IDENTITY, own: true, trusted: true })) ?? failUndefined();
    this._deviceKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE })) ?? failUndefined();
    this._deviceKeyChain = getDeviceKeyChainFromHalo(this._halo, this.deviceKey);
    assert(this._halo.identityGenesis);
  }

  get signer (): Signer {
    return this._keyring;
  }

  get keyring (): Keyring {
    return this._keyring;
  }

  get identityKey (): KeyRecord {
    return this._identityKey;
  }

  get deviceKey (): KeyRecord {
    return this._deviceKey;
  }

  get deviceKeyChain (): KeyChain {
    return this._deviceKeyChain;
  }

  get displayName (): string | undefined {
    return this.identityInfo?.signed.payload.displayName;
  }

  /**
   * Contains profile username.
   * Can be missing if the username wasn't provided when profile was created.
   */
  get identityInfo (): SignedMessage | undefined {
    return this._halo.identityInfo;
  }

  get identityGenesis (): SignedMessage {
    return this._halo.identityGenesis ?? failUndefined();
  }

  get preferences (): Preferences {
    return this._halo.preferences;
  }

  get contacts (): ContactManager {
    return this._halo.contacts;
  }

  /**
   * HALO party. Must be open.
   */
  get halo (): HaloParty {
    return this._halo;
  }

  createCredentialsSigner (): CredentialsSigner {
    return new CredentialsSigner(
      this._keyring,
      this.identityKey,
      this.deviceKey,
      this.deviceKeyChain
    );
  }
}

export type IdentityProvider = () => Identity | undefined;

const getDeviceKeyChainFromHalo = (halo: HaloParty, deviceKey: KeyRecord) => {
  try {
    return Keyring.buildKeyChain(
      deviceKey.publicKey,
      halo.credentialMessages,
      halo.feedKeys
    );
  } catch (err: any) {
    log('Unable to locate device KeyChain:', err);
    throw err;
  }
};
