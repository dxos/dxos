//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import assert from 'assert';

import { createKeyAdmitMessage, createDeviceInfoMessage, createIdentityInfoMessage, Filter, KeyChain, KeyRecord, Keyring, KeyType, SignedMessage, createPartyGenesisMessage, Message } from '@dxos/credentials';

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

  static fromKeyring(keyring: Keyring) {
    return new Identity(
      keyring,
      undefined,
      undefined,
      undefined,
      () => undefined,
    )
  }

  static createFromHalo(keyring: Keyring, halo: HaloParty) {
    const identity = Identity.fromKeyring(keyring)
    identity.setHalo(halo);
    return identity;
  }

  static async newIdentity(keyring: Keyring) {
    assert(!keyring.findKey(Filter.matches({ type: KeyType.IDENTITY})), 'Identity key already present');

    const identityKey = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const deviceKey = await keyring.createKeyRecord({ type: KeyType.DEVICE });
    const identityInfo = createIdentityInfoMessage(keyring, identityKey.publicKey.humanize(), identityKey)
    const deviceInfo = createDeviceInfoMessage(keyring, deviceKey.publicKey.humanize(), deviceKey)
    const identityGenesis = createKeyAdmitMessage(keyring, identityKey.publicKey, identityKey)
    const partyGenesis = createPartyGenesisMessage(keyring, identityKey, deviceKey, deviceKey)

    const credentials = new Map<string, SignedMessage | Message>()
    credentials.set(deviceKey.publicKey.toHex(), partyGenesis);
    credentials.set(identityKey.publicKey.toHex(), identityGenesis);

    return new Identity(
      keyring,
      identityInfo.payload,
      identityGenesis.payload,
      undefined,
      () => Keyring.buildKeyChain(
        deviceKey.publicKey,
        credentials,
      ),
    )
  }

  constructor (
    private readonly _keyring: Keyring,
    private _identityInfo: SignedMessage | undefined,
    private _identityGenesis: SignedMessage | undefined,
    private _halo: HaloParty | undefined,
    private _getDeviceKeyChain: () => KeyChain | undefined,
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
      this._deviceKeyChain = this._getDeviceKeyChain();
    }

    return this._deviceKeyChain;
  }

  get halo (): HaloParty | undefined {
    return this._halo;
  }

  get displayName (): string | undefined {
    return this._identityInfo?.signed.payload.displayName;
  }

  get identityInfo (): SignedMessage | undefined {
    return this._identityInfo;
  }

  get identityGenesis (): SignedMessage | undefined {
    return this._identityGenesis;
  }

  /**
   * @internal
   * 
   * Called by `IdentityManager` when HALO party is initialized.
   */
  setHalo(halo: HaloParty) {
    this._halo = halo;
    this._identityGenesis = halo.identityGenesis;
    this._identityInfo = halo.identityInfo;
    this._getDeviceKeyChain = () => this.deviceKey ? getDeviceKeyChainFromHalo(halo, this.deviceKey) : undefined;
  }
}

export type IdentityProvider = () => Identity;

function getDeviceKeyChainFromHalo(halo: HaloParty, deviceKey: KeyRecord) {
  try {
    return Keyring.buildKeyChain(
      deviceKey.publicKey,
      halo.credentialMessages,
      halo.feedKeys
    )
  } catch (err) {
    log('Unable to locate device KeyChain:', err); // TODO(burdon): ???
    return undefined
  }
}
