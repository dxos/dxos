//
// Copyright 2019 DXOS.org
//

/* eslint-disable jest/no-done-callback */

import assert from 'assert';
import defaultHypercore from 'hypercore';
import pify from 'pify';
import tempy from 'tempy';

import { createKeyPair } from '@dxos/crypto';
import { PublicKey } from '@dxos/protocols';
import { createStorage, StorageType } from '@dxos/random-access-multi-storage';

import FeedDescriptor from './feed-descriptor';

describe('FeedDescriptor', () => {
  let fd: FeedDescriptor;

  beforeEach(async () => {
    const { publicKey, secretKey } = createKeyPair();
    fd = new FeedDescriptor({
      directory: createStorage('', StorageType.RAM).directory('feed'),
      key: PublicKey.from(publicKey),
      secretKey,
      hypercore: defaultHypercore
    });
  });

  afterEach(async () => {
    await fd.close();
  });

  test('Create', () => {
    expect(fd).toBeInstanceOf(FeedDescriptor);
    expect(fd.key).toBeDefined();
    expect(fd.secretKey).toBeDefined();
  });

  test('Can create feed descriptor with public key but without private key', async () => {
    // When this behaviour was changed, suddenly `protocol-plugin-replicator` tests started hanging forever on network generation.
    const { publicKey } = createKeyPair();
    const key = PublicKey.from(publicKey);
    const fd = new FeedDescriptor({ key, directory: createStorage('', StorageType.NODE).directory('feed'), hypercore: defaultHypercore });
    expect(fd.key).toEqual(key);
    expect(fd.secretKey).toBeUndefined();
  });

  test('Create custom options', () => {
    const { publicKey, secretKey } = createKeyPair();

    const fd = new FeedDescriptor({
      directory: createStorage('', StorageType.RAM).directory('feed'),
      key: PublicKey.from(publicKey),
      secretKey,
      valueEncoding: 'json',
      hypercore: defaultHypercore
    });

    expect(fd).toBeInstanceOf(FeedDescriptor);
    expect(fd.key).toBeInstanceOf(PublicKey);
    expect(fd.secretKey).toBeInstanceOf(Buffer);
    expect(fd.valueEncoding).toBe('json');
  });

  test('Open', async () => {
    expect(fd.opened).toBe(false);

    // Opening multiple times should actually open once.
    const [feed1, feed2] = await Promise.all([fd.open(), fd.open()]);
    expect(feed1).toBe(feed2);

    assert(fd.feed);

    expect(fd.feed).toBe(feed1);
    expect(fd.feed.key).toBeInstanceOf(Buffer);
    expect(fd.opened).toBe(true);
  });

  test('Close', async () => {
    await fd.open();
    // Closing multiple times should actually close once.
    await Promise.all([fd.close(), fd.close()]);
    expect(fd.opened).toBe(false);

    assert(fd.feed);

    fd.feed.append('test', (err: any) => {
      expect(err.message).toContain('This feed is not writable');
    });

    // If we try to close a feed that is opening should wait for the open result.
    const { publicKey, secretKey } = createKeyPair();
    const fd2 = new FeedDescriptor({
      directory: createStorage('', StorageType.RAM).directory('feed'),
      key: PublicKey.from(publicKey),
      secretKey,
      hypercore: defaultHypercore
    });

    await fd2.open();
    await expect(fd2.close()).resolves.toBeUndefined();
    expect(fd.opened).toBe(false);
  });

  test('Close and open again', async () => {
    const root = tempy.directory();

    const { publicKey, secretKey } = createKeyPair();
    const fd = new FeedDescriptor({
      directory: createStorage(root, StorageType.NODE).directory('feed'),
      key: PublicKey.from(publicKey),
      secretKey,
      valueEncoding: 'utf-8',
      hypercore: defaultHypercore
    });

    await fd.open();
    expect(fd.opened).toBe(true);

    assert(fd.feed);

    await pify(fd.feed.append.bind(fd.feed))('test');

    await fd.close();
    expect(fd.opened).toBe(false);

    await fd.open();
    expect(fd.opened).toBe(true);

    const msg = await pify(fd.feed.head.bind(fd.feed))();
    expect(msg).toBe('test');
  });

  test('on open error should unlock the resource', async () => {
    const { publicKey, secretKey } = createKeyPair();
    const fd = new FeedDescriptor({
      directory: createStorage('', StorageType.RAM).directory('feed'),
      key: PublicKey.from(publicKey),
      secretKey,
      hypercore: () => {
        throw new Error('open error');
      }
    });

    await expect(fd.open()).rejects.toThrow(/open error/);
  });

  test('on close error should unlock the resource', async () => {
    const { publicKey, secretKey } = createKeyPair();
    const fd = new FeedDescriptor({
      directory: createStorage('', StorageType.RAM).directory('feed'),
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
