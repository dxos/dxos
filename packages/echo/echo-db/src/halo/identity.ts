//
// Copyright 2021 DXOS.org
//

import debug from 'debug';

import { Filter, KeyChain, KeyRecord, Keyring, KeyType, Signer } from '@dxos/credentials';
import { failUndefined, raise } from '@dxos/debug';

import { IdentityNotInitializedError } from '../errors';
import { CredentialsSigner } from '../protocol/credentials-signer';
import { ContactManager } from './contact-manager';
import { HaloParty } from './halo-party';
import { Preferences } from './preferences';

const log = debug('dxos:echo-db:identity');

/**
 * Represents users identity exposing access to signing keys and HALO party.
 *
 * Acts as a read-only view into IdentityManager.
 */
export class Identity {
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
    this._deviceKeyChain = getDeviceKeyChainFromHalo(this._halo, this.deviceKey)
  }

  get signer (): Signer {
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

  get preferences (): Preferences | undefined {
    return this._halo?.preferences;
  }

  get contacts (): ContactManager | undefined {
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
   * HALO party. Must be open.
   */
  get halo (): HaloParty {
    return this._halo;
  }

  get keyring () {
    return this._keyring;
  }

  createCredentialsSigner (): CredentialsSigner {
    return new CredentialsSigner(
      this._keyring,
      this.identityKey,
      this.deviceKey,
      this.deviceKeyChain,
    );
  }
}

export type IdentityProvider = () => Identity | undefined;

function getDeviceKeyChainFromHalo (halo: HaloParty, deviceKey: KeyRecord) {
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
}
