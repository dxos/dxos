//
// Copyright 2019 DXOS.org
//

/* eslint-disable jest/no-test-callback */

import crypto from 'hypercore-crypto';
import pify from 'pify';
import ram from 'random-access-memory';
import tempy from 'tempy';

import FeedDescriptor from './feed-descriptor';

describe('FeedDescriptor', () => {
  let fd = null;

  test('Create', () => {
    const fd = new FeedDescriptor('/foo');

    expect(fd).toBeInstanceOf(FeedDescriptor);
    expect(fd.path).toBe('/foo');
    expect(fd.key).toBeDefined();
    expect(fd.secretKey).toBeDefined();
  });

  test('Validate asserts', () => {
    expect(() => new FeedDescriptor()).toThrow(/path is required/);
    expect(() => new FeedDescriptor('/foo', { key: 'foo' })).toThrow(/key must be a buffer/);
    expect(() => new FeedDescriptor('/foo', {
      key: crypto.keyPair().publicKey,
      secretKey: 'foo'
    })).toThrow(/secretKey must be a buffer/);
    expect(() => new FeedDescriptor('/foo', { secretKey: crypto.keyPair().secretKey })).toThrow(/missing publicKey/);
    expect(() => new FeedDescriptor('/foo', { valueEncoding: {} })).toThrow(/valueEncoding must be a string/);
  });

  test('Create custom options', () => {
    const { publicKey, secretKey } = crypto.keyPair();

    const metadata = {
      subject: 'books'
    };

    fd = new FeedDescriptor('/books', {
      storage: ram,
      key: publicKey,
      secretKey,
      valueEncoding: 'json',
      metadata
    });

    expect(fd).toBeInstanceOf(FeedDescriptor);
    expect(fd.path).toBe('/books');
    expect(fd.key).toBeInstanceOf(Buffer);
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

    expect(fd.feed).toBe(feed1);
    expect(fd.feed.key).toBeInstanceOf(Buffer);
    expect(fd.opened).toBe(true);
  });

  test('Close', async () => {
    // Closing multiple times should actually close once.
    await Promise.all([fd.close(), fd.close()]);
    expect(fd.opened).toBe(false);

    fd.feed.append('test', (err) => {
      expect(err.message).toContain('This feed is not writable');
    });

    // If we try to close a feed that is opening should wait for the open result.
    const fd2 = new FeedDescriptor('/feed2', {
      storage: ram
    });

    fd2.open();
    await expect(fd2.close()).resolves.toBeUndefined();
    expect(fd.opened).toBe(false);
  });

  test('Close and open again', async () => {
    const root = tempy.directory();

    const fd = new FeedDescriptor('/feed1', {
      storage: root,
      valueEncoding: 'utf-8'
    });

    await fd.open();
    expect(fd.opened).toBe(true);

    await pify(fd.feed.append.bind(fd.feed))('test');

    await fd.close();
    expect(fd.opened).toBe(false);

    await fd.open();
    expect(fd.opened).toBe(true);

    const msg = await pify(fd.feed.head.bind(fd.feed))();
    expect(msg).toBe('test');
  });

  test('Watch data', async (done) => {
    const fd = new FeedDescriptor('/feed', {
      storage: ram
    });

    fd.watch(event => {
      expect(event).toBe('opened');
      fd.watch(null);
      fd.close().then(done);
    });

    await fd.open();
  });

  test('on open error should unlock the resource', async () => {
    const fd = new FeedDescriptor('/foo', {
      storage: ram,
      hypercore: () => {
        throw new Error('open error');
      }
    });

    await expect(fd.open()).rejects.toThrow(/open error/);

    const release = await fd.lock();
    expect(release).toBeDefined();
    await release();
  });

  test('on close error should unlock the resource', async () => {
    const fd = new FeedDescriptor('/foo', {
      storage: ram,
      hypercore: () => ({
        opened: true,
        on () {},
        ready (cb) {
          cb();
        },
        close () {
          throw new Error('close error');
        }
      })
    });

    await fd.open();

    await expect(fd.close()).rejects.toThrow(/close error/);

    const release = await fd.lock();
    expect(release).toBeDefined();
    await release();
  });
});
