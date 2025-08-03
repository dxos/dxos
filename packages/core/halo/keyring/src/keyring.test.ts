//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { verifySignature } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { StorageType, createStorage } from '@dxos/random-access-storage';

import { Keyring } from './keyring';
import { generateJWKKeyPair, parseJWKKeyPair } from './testing';

describe('Keyring', () => {
  test('sign & verify', async () => {
    const keyring = new Keyring(createStorage({ type: StorageType.RAM }).createDirectory('keyring'));

    const key = await keyring.createKey();
    const message = Buffer.from('hello');
    const signature = await keyring.sign(key, message);

    expect(await verifySignature(key, message, signature)).toBeTruthy();
  });

  test('signature verification fails on invalid signature', async () => {
    const keyring = new Keyring(createStorage({ type: StorageType.RAM }).createDirectory('keyring'));

    const key = await keyring.createKey();
    const message = Buffer.from('hello');
    const _signature = await keyring.sign(key, message);

    expect(await verifySignature(key, message, Buffer.from([1, 2, 3]))).toBeFalsy();
  });

  test('signature verification fails on invalid input data', async () => {
    const keyring = new Keyring(createStorage({ type: StorageType.RAM }).createDirectory('keyring'));

    const key = await keyring.createKey();
    const message = Buffer.from('hello');
    const signature = await keyring.sign(key, message);

    expect(await verifySignature(key, Buffer.from([1, 2, 3]), signature)).toBeFalsy();
  });

  test('signature verification fails on invalid key', async () => {
    const keyring = new Keyring(createStorage({ type: StorageType.RAM }).createDirectory('keyring'));

    const key = await keyring.createKey();
    const message = Buffer.from('hello');
    const signature = await keyring.sign(key, message);

    expect(await verifySignature(PublicKey.random(), message, signature)).toBeFalsy();
  });

  test('reload from storage', async () => {
    const storage = createStorage({ type: StorageType.RAM }).createDirectory('keyring');

    const keyring1 = new Keyring(storage);
    const key = await keyring1.createKey();

    const keyring2 = new Keyring(storage);
    const message = Buffer.from('hello');
    const signature = await keyring2.sign(key, message);

    expect(await verifySignature(key, message, signature)).toBeTruthy();
  });

  test('list keys', async () => {
    const keyring = new Keyring(createStorage({ type: StorageType.RAM }).createDirectory('keyring'));
    const count = 10;
    const hexKeys: string[] = [];
    for (let i = 0; i < count; i++) {
      hexKeys.push((await keyring.createKey()).toHex());
    }
    expect((await keyring.list()).every((key) => hexKeys.includes(PublicKey.from(key.publicKey).toHex()))).toBeTruthy();
  });

  test('event emits', async () => {
    const keyring = new Keyring(createStorage({ type: StorageType.RAM }).createDirectory('keyring'));
    const count = 10;
    let emittedCount = 0;
    keyring.keysUpdate.on(() => {
      emittedCount++;
    });
    for (let i = 0; i < count; i++) {
      await keyring.createKey();
    }
    expect(emittedCount).toBe(count);
  });

  test('import key', async () => {
    const keyring = new Keyring(createStorage({ type: StorageType.RAM }).createDirectory('keyring'));

    const keyPair = await generateJWKKeyPair();
    const key = await keyring.importKeyPair(await parseJWKKeyPair(keyPair.privateKey, keyPair.publicKey));
    expect(keyPair.publicKeyHex).toEqual(key.toHex());
  });

  test('delete key', () => {});
});
