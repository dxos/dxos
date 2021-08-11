//
// Copyright 2019 DXOS.org
//

/* eslint-disable jest/no-done-callback */

import assert from 'assert';
import pify from 'pify';
import tempy from 'tempy';

import { PublicKey, createKeyPair } from '@dxos/crypto';
import { createStorage, STORAGE_NODE, STORAGE_RAM } from '@dxos/random-access-multi-storage';

import FeedDescriptor from './feed-descriptor';

// Caution: the tests depend on each other in sequence.
describe('FeedDescriptor', () => {
  let fd: FeedDescriptor;

  test('Create', () => {
    const { publicKey, secretKey } = createKeyPair();
    const fd = new FeedDescriptor({
      storage: createStorage('', STORAGE_NODE),
      key: PublicKey.from(publicKey),
      secretKey
    });

    expect(fd).toBeInstanceOf(FeedDescriptor);
    expect(fd.key).toBeDefined();
    expect(fd.secretKey).toBeDefined();
  });

  test('Can create feed descriptor with public key but without private key', async () => {
    // When this behaviour was changed, suddenly `protocol-plugin-replicator` tests started hanging forever on network generation.
    const { publicKey } = createKeyPair();
    const key = PublicKey.from(publicKey);
    const fd = new FeedDescriptor({ key, storage: createStorage('', STORAGE_NODE) });
    expect(fd.key).toEqual(key);
    expect(fd.secretKey).toBeUndefined();
  });

  test('Create custom options', () => {
    const { publicKey, secretKey } = createKeyPair();

    const metadata = {
      subject: 'books'
    };

    fd = new FeedDescriptor({
      storage: createStorage('', STORAGE_RAM),
      key: PublicKey.from(publicKey),
      secretKey,
      valueEncoding: 'json',
      metadata
    });

    expect(fd).toBeInstanceOf(FeedDescriptor);
    expect(fd.key).toBeInstanceOf(PublicKey);
    expect(fd.secretKey).toBeInstanceOf(Buffer);
    expect(fd.metadata).toEqual(metadata);
    expect(fd.valueEncoding).toBe('json');
  });

  test('Open', async () => {
    expect(fd.feed).toBeNull();
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
      storage: createStorage('', STORAGE_RAM),
      key: PublicKey.from(publicKey),
      secretKey
    });

    fd2.open();
    await expect(fd2.close()).resolves.toBeUndefined();
    expect(fd.opened).toBe(false);
  });

  test('Close and open again', async () => {
    const root = tempy.directory();

    const { publicKey, secretKey } = createKeyPair();
    const fd = new FeedDescriptor({
      storage: createStorage(root, STORAGE_NODE),
      key: PublicKey.from(publicKey),
      secretKey,
      valueEncoding: 'utf-8'
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

  test('Watch data', async (done) => {
    const { publicKey, secretKey } = createKeyPair();
    const fd = new FeedDescriptor({
      storage: createStorage('', STORAGE_RAM),
      key: PublicKey.from(publicKey),
      secretKey
    });

    fd.watch(event => {
      expect(event).toBe('opened');
      fd.watch(null);
      fd.close().then(done);
    });

    await fd.open();
  });

  test('on open error should unlock the resource', async () => {
    const { publicKey, secretKey } = createKeyPair();
    const fd = new FeedDescriptor({
      storage: createStorage('', STORAGE_RAM),
      key: PublicKey.from(publicKey),
      secretKey,
      hypercore: () => {
        throw new Error('open error');
      }
    });

    await expect(fd.open()).rejects.toThrow(/open error/);

    await expect(fd.lock.executeSynchronized(async () => 'Unlocked')).resolves.toBe('Unlocked');
  });

  test('on close error should unlock the resource', async () => {
    const { publicKey, secretKey } = createKeyPair();
    const fd = new FeedDescriptor({
      storage: createStorage('', STORAGE_RAM),
      key: PublicKey.from(publicKey),
      secretKey,
      hypercore: () => ({
        opened: true,
        on () {},
        ready (cb: () => void) {
          cb();
        },
        close () {
          throw new Error('close error');
        }
      } as any)
    });

    await fd.open();

    await expect(fd.close()).rejects.toThrow(/close error/);

    await expect(fd.lock.executeSynchronized(async () => 'Unlocked')).resolves.toBe('Unlocked');
  });
});
