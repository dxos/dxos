//
// Copyright 2019 DXOS.org
//

// @dxos/mocha platform=nodejs

import expect from 'expect';
import assert from 'node:assert';
import pify from 'pify';
import tempy from 'tempy';

import { createKeyPair } from '@dxos/crypto';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { createStorage, StorageType } from '@dxos/random-access-storage';

import { FeedDescriptor } from './feed-descriptor';

describe('FeedDescriptor', function () {
  let feedDescriptor: FeedDescriptor;

  beforeEach(async function () {
    const keyring = new Keyring();
    feedDescriptor = new FeedDescriptor({
      directory: createStorage({ type: StorageType.RAM }).createDirectory('feed'),
      key: await keyring.createKey(),
      signer: keyring
    });
  });

  afterEach(async function () {
    await feedDescriptor.close();
  });

  it('Create', function () {
    expect(feedDescriptor).toBeInstanceOf(FeedDescriptor);
    expect(feedDescriptor.key).toBeDefined();
  });

  it('Can create feed descriptor with public key but without private key', async function () {
    // When this behaviour was changed, suddenly `protocol-plugin-replicator` tests started hanging forever on network generation.
    const { publicKey } = createKeyPair();
    const key = PublicKey.from(publicKey);
    const fd = new FeedDescriptor({
      key,
      directory: createStorage({ type: StorageType.NODE }).createDirectory('feed')
    });
    expect(fd.key).toEqual(key);
    expect(fd.secretKey).toBeUndefined();
  });

  it('Create custom options', function () {
    const { publicKey, secretKey } = createKeyPair();
    const fd = new FeedDescriptor({
      directory: createStorage({ type: StorageType.RAM }).createDirectory('feed'),
      key: PublicKey.from(publicKey),
      secretKey,
      valueEncoding: 'json'
    });

    expect(fd).toBeInstanceOf(FeedDescriptor);
    expect(fd.key).toBeInstanceOf(PublicKey);
    expect(fd.secretKey).toBeInstanceOf(Buffer);
    expect(fd.valueEncoding).toBe('json');
  });

  it('Open', async function () {
    expect(feedDescriptor.opened).toBe(false);

    // Opening multiple times should actually open once.
    const [fd1, fd2] = await Promise.all([feedDescriptor.open(), feedDescriptor.open()]);
    expect(fd1).toBe(fd2);
    assert(feedDescriptor.feed);
    expect(feedDescriptor.feed).toBe(fd1);
    expect(feedDescriptor.feed.key).toBeInstanceOf(Buffer);
    expect(feedDescriptor.opened).toBe(true);
  });

  it('Close', async function () {
    await feedDescriptor.open();
    // Closing multiple times should actually close once.
    await Promise.all([feedDescriptor.close(), feedDescriptor.close()]);
    expect(feedDescriptor.opened).toBe(false);
    feedDescriptor.feed.append('test', (err: any) => {
      expect(err.message).toContain('This feed is not writable');
    });

    // If we try to close a feed that is opening should wait for the open result.
    const { publicKey, secretKey } = createKeyPair();
    const fd = new FeedDescriptor({
      directory: createStorage({ type: StorageType.RAM }).createDirectory('feed'),
      key: PublicKey.from(publicKey),
      secretKey
    });

    await fd.open();
    await expect(fd.close()).resolves.toBeUndefined();
    expect(feedDescriptor.opened).toBe(false);
  });

  it('Close and open again', async function () {
    const root = tempy.directory();
    const { publicKey, secretKey } = createKeyPair();
    const fd = new FeedDescriptor({
      directory: createStorage({ type: StorageType.NODE, root }).createDirectory('feed'),
      key: PublicKey.from(publicKey),
      secretKey,
      valueEncoding: 'utf-8'
    });

    // TODO(burdon): Foo

    // TODO(burdon): ???
    await fd.open();
    expect(fd.opened).toBe(true);
    // await fd.append('test');
    await pify(fd.feed.append.bind(fd.feed))('test');

    // await fd.close();
    // expect(fd.opened).toBe(false);

    // await fd.open();
    // expect(fd.opened).toBe(true);

    // const msg = await pify(fd.feed.head.bind(fd.feed))();
    // expect(msg).toBe('test');
  });

  it('on open error should unlock the resource', async function () {
    const { publicKey, secretKey } = createKeyPair();
    const fd = new FeedDescriptor({
      directory: createStorage({ type: StorageType.RAM }).createDirectory('feed'),
      key: PublicKey.from(publicKey),
      secretKey,
      hypercore: () => {
        throw new Error('open error');
      }
    });

    await expect(fd.open()).rejects.toThrow(/open error/);
  });

  it.skip('on close error should unlock the resource', async function () {
    const { publicKey, secretKey } = createKeyPair();
    const fd = new FeedDescriptor({
      directory: createStorage({ type: StorageType.RAM }).createDirectory('feed'),
      key: PublicKey.from(publicKey),
      secretKey,
      hypercore: () => ({
        opened: true,
        on: () => {},
        ready: (cb: () => void) => {
          cb();
        },
        close: () => {
          throw new Error('close error');
        }
      } as any)
    });

    await fd.open();
    await expect(fd.close()).rejects.toThrow(/close error/);
  });
});
