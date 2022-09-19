//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { PublicKey } from '@dxos/protocols';
import { createStorage, StorageType } from '@dxos/random-access-storage';

import { Keyring } from './keyring';
import { verifySignature } from './verify';

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

  test('list keys');

  test('delete key');
});
