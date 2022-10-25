//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { verifySignature } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { createStorage, StorageType } from '@dxos/random-access-storage';

import { Keyring } from './keyring';

describe('Keyring', function () {
  it('sign & verify', async function () {
    const keyring = new Keyring(createStorage({ type: StorageType.RAM }).createDirectory('keyring'));

    const key = await keyring.createKey();
    const message = Buffer.from('hello');
    const signature = await keyring.sign(key, message);

    expect(await verifySignature(key, message, signature)).toBeTruthy();
  });

  it('signature verification fails on invalid signature', async function () {
    const keyring = new Keyring(createStorage({ type: StorageType.RAM }).createDirectory('keyring'));

    const key = await keyring.createKey();
    const message = Buffer.from('hello');
    const _signature = await keyring.sign(key, message);

    expect(await verifySignature(key, message, Buffer.from([1, 2, 3]))).toBeFalsy();
  });

  it('signature verification fails on invalid input data', async function () {
    const keyring = new Keyring(createStorage({ type: StorageType.RAM }).createDirectory('keyring'));

    const key = await keyring.createKey();
    const message = Buffer.from('hello');
    const signature = await keyring.sign(key, message);

    expect(await verifySignature(key, Buffer.from([1, 2, 3]), signature)).toBeFalsy();
  });

  it('signature verification fails on invalid key', async function () {
    const keyring = new Keyring(createStorage({ type: StorageType.RAM }).createDirectory('keyring'));

    const key = await keyring.createKey();
    const message = Buffer.from('hello');
    const signature = await keyring.sign(key, message);

    expect(await verifySignature(PublicKey.random(), message, signature)).toBeFalsy();
  });

  it('reload from storage', async function () {
    const storage = createStorage({ type: StorageType.RAM }).createDirectory('keyring');

    const keyring1 = new Keyring(storage);
    const key = await keyring1.createKey();

    const keyring2 = new Keyring(storage);
    const message = Buffer.from('hello');
    const signature = await keyring2.sign(key, message);

    expect(await verifySignature(key, message, signature)).toBeTruthy();
  });

  it('list keys');

  it('delete key');
});
