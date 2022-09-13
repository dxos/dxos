//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { createStorage, StorageType } from '@dxos/random-access-storage';

import { Keyring } from './keyring';

describe('Keyring', () => {
  test('sign & verify with the same keyring', async () => {
    const keyring = new Keyring(createStorage({ type: StorageType.RAM }).createDirectory('keyring'));

    const key = await keyring.createKey();
    const message = Buffer.from('hello');
    const signature = await keyring.sign(key, message);

    expect(await keyring.verify(key, message, signature)).toBeTruthy();
  });

  test('sign & verify with a different keyring', async () => {
    const keyring1 = new Keyring(createStorage({ type: StorageType.RAM }).createDirectory('keyring'));
    const keyring2 = new Keyring(createStorage({ type: StorageType.RAM }).createDirectory('keyring'));

    const key = await keyring1.createKey();
    const message = Buffer.from('hello');
    const signature = await keyring1.sign(key, message);

    expect(await keyring2.verify(key, message, signature)).toBeTruthy();
  });

  test('reload from storage', async () => {
    const storage = createStorage({ type: StorageType.RAM }).createDirectory('keyring');
    const keyring1 = new Keyring(storage);

    const key = await keyring1.createKey();

    const keyring2 = new Keyring(storage);
    const message = Buffer.from('hello');
    const signature = await keyring2.sign(key, message);

    expect(await keyring1.verify(key, message, signature)).toBeTruthy();
  });

  test('list keys');

  test('delete key');
});
