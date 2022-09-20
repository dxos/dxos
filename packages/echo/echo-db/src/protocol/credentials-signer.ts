//
// Copyright 2022 DXOS.org
//

import { Filter, Keyring, Signer } from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';
import { Chain } from '@dxos/halo-protocol';
import { PublicKey } from '@dxos/keys';
import { KeyRecord, KeyType } from '@dxos/protocols/proto/dxos/halo/keys';

/**
 * Contains a signer (keyring), provides signing keys to create signed credential messages.
 */
export class CredentialsSigner {
  /**
   * Queries IDENTITY and DEVICE keys from the keyring.
   * Uses the device key without keychain for signing.
   */
  static createDirectDeviceSigner (keyring: Keyring) {
    const identityKey = keyring.findKey(Filter.matches({ type: KeyType.IDENTITY, own: true, trusted: true })) ?? failUndefined();
    const deviceKey = keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE })) ?? failUndefined();

    return new CredentialsSigner(
      keyring,
      identityKey,
      deviceKey,
      deviceKey.publicKey
    );
  }

  constructor (
    private readonly _signer: Signer,
    private readonly _identityKey: KeyRecord,
    private readonly _deviceKey: KeyRecord,
    private readonly _signingKeys: PublicKey | Chain
  ) {}

  get signer (): Signer {
    return this._signer;
  }

  getIdentityKey (): KeyRecord {
    return this._identityKey;
  }

  getDeviceKey (): KeyRecord {
    return this._deviceKey;
  }

  /**
   * @returns Either a device key record or a key-chain for the device key.
   *
   * HALO-party members are devices of the same profile,
   * and their admission credential messages are stored in the same HALO party
   * so they can sign directly with their DEVICE key.
   *
   * Data-parties don't store credentials that admit devices to profiles.
   * Devices need to sign with their keyChain including the device key admission credential in the signature.
   */
  getDeviceSigningKeys (): PublicKey | Chain {
    return this._signingKeys;
  }
}
