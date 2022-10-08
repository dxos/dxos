//
// Copyright 2019 DXOS.org
//

// @dxos/mocha platform=nodejs

import expect from 'expect';
import { HypercoreFeed } from 'packages/common/feed-store/src/hypercore';
import pify from 'pify';

import { createKeyPair } from '@dxos/crypto';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { createStorage, StorageType } from '@dxos/random-access-storage';

import { FeedDescriptor } from './feed-descriptor';

describe('FeedDescriptor', function () {
  let feedDescriptor: FeedDescriptor;

  // TODO(burdon): Is this safe?
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

  it('create', function () {
    expect(feedDescriptor).toBeInstanceOf(FeedDescriptor);
    expect(feedDescriptor.key).toBeDefined();
  });

  it('can create feed descriptor with public key but without private key', async function () {
    // TODO(burdon): When this behaviour was changed, suddenly `protocol-plugin-replicator` tests started hanging forever on network generation.
    const { publicKey } = createKeyPair();
    const key = PublicKey.from(publicKey);
    const fd = new FeedDescriptor({
      key,
      directory: createStorage({ type: StorageType.NODE }).createDirectory('feed') // TODO(burdon): RAM?
    });
    expect(fd.key).toEqual(key);
    expect(fd.secretKey).toBeUndefined();
  });

  it('create custom options', function () {
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

  it('open', async function () {
    expect(feedDescriptor.opened).toBe(false);

    // Opening multiple times should actually open once.
    const [feed1, feed2]: HypercoreFeed[] = await Promise.all([feedDescriptor.open(), feedDescriptor.open()]);

    expect(feed1).toEqual(feed2);
    expect(feed1.key).toEqual(feed2.key);
    expect(feedDescriptor.feed).toBeDefined();
    expect(feedDescriptor.feed).toBe(feed1);
    expect(feedDescriptor.feed.key).toBeInstanceOf(Buffer);
    expect(feedDescriptor.opened).toBe(true);
  });

  it('close', async function () {
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

  // TODO(burdon): This doesn't work.
  it.skip('close and open again', async function () {
    const { publicKey, secretKey } = createKeyPair();
    const fd = new FeedDescriptor({
      directory: createStorage({ type: StorageType.RAM }).createDirectory('feed'),
      key: PublicKey.from(publicKey),
      secretKey
      // valueEncoding: 'utf-8'
    });

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
      hypercore: () => ({ // TODO(burdon): Use mock.
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
