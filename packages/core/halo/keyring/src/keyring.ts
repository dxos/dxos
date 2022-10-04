//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { synchronized } from '@dxos/async';
import { subtleCrypto, Signer } from '@dxos/crypto';
import { todo } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { schema } from '@dxos/protocols';
import { KeyRecord } from '@dxos/protocols/proto/dxos/halo/keyring';
import { createStorage, Directory, StorageType } from '@dxos/random-access-storage';
import { ComplexMap } from '@dxos/util';

/**
 * Manages keys.
 */
export class Keyring implements Signer {
  private readonly _keyCache = new ComplexMap<PublicKey, CryptoKeyPair>(key => key.toHex());

  constructor (
    private readonly _storage: Directory = createStorage({ type: StorageType.RAM }).createDirectory('keyring')
  ) {}

  async sign (key: PublicKey, message: Uint8Array): Promise<Uint8Array> {
    const keyPair = await this._getKey(key);

    return new Uint8Array(await subtleCrypto.sign({
      name: 'ECDSA',
      hash: 'SHA-256'
    }, keyPair.privateKey, message));
  }

  async createKey (): Promise<PublicKey> {
    const keyPair = await subtleCrypto.generateKey({
      name: 'ECDSA',
      namedCurve: 'P-256'
    }, true, ['sign', 'verify']);

    await this._setKey(keyPair);

    return keyPairToPublicKey(keyPair);
  }

  @synchronized
  private async _getKey (key: PublicKey): Promise<CryptoKeyPair> {
    if (!this._keyCache.has(key)) {
      const file = this._storage.createOrOpenFile(key.toHex());
      const { size } = await file.stat();
      if (size === 0) {
        throw new Error('Key not found');
      }

      const recordBytes = await file.read(0, size);
      await file.close();

      const record = schema.getCodecForType('dxos.halo.keyring.KeyRecord').decode(recordBytes);
      const publicKey = PublicKey.from(record.publicKey);
      assert(key.equals(publicKey), 'Corrupted keyring: Key mismatch');

      const keyPair: CryptoKeyPair = {
        publicKey: await subtleCrypto.importKey('raw', record.publicKey, {
          name: 'ECDSA',
          namedCurve: 'P-256'
        }, true, ['verify']),
        privateKey: await subtleCrypto.importKey('pkcs8', record.privateKey, {
          name: 'ECDSA',
          namedCurve: 'P-256'
        }, true, ['sign'])
      };

      this._keyCache.set(publicKey, keyPair);
    }

    return this._keyCache.get(key)!; // TODO(burdon): Fail if null?
  }

  @synchronized
  private async _setKey (keyPair: CryptoKeyPair) {
    const publicKey = await keyPairToPublicKey(keyPair);
    this._keyCache.set(publicKey, keyPair);

    const record: KeyRecord = {
      publicKey: publicKey.asUint8Array(),
      privateKey: new Uint8Array(await subtleCrypto.exportKey('pkcs8', keyPair.privateKey))
    };

    const file = this._storage.createOrOpenFile(publicKey.toHex());
    await file.write(0, Buffer.from(schema.getCodecForType('dxos.halo.keyring.KeyRecord').encode(record)));
    await file.close();
  }

  // TODO(burdon): ???
  deleteKey (key: PublicKey): Promise<void> {
    return todo('We need a method to delete a file.');
  }

  // TODO(burdon): ???
  list (): Promise<PublicKey[]> {
    return todo('We need a method to enumerate files in a directory.');
  }
}

const keyPairToPublicKey = async (keyPair: CryptoKeyPair): Promise<PublicKey> => {
  return PublicKey.from(new Uint8Array(await subtleCrypto.exportKey('raw', keyPair.publicKey)));
};
