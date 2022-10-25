//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';
import faker from 'faker';
import ProtocolStream from 'hypercore-protocol';

import { latch } from '@dxos/async';
import { createKeyPair } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { HypercoreFactory } from './hypercore-factory';

// TODO(burdon): Test encoding.
// TODO(burdon): Simulate multiple peers and broadcast.

describe('ProtocolStream', function () {
  it('protocol stream handshake completes', async function () {
    const [handshake, setHandshake] = latch({ count: 2 });

    const stream1 = new ProtocolStream(true, {
      onhandshake: () => {
        log('onhandshake', { key: PublicKey.from(stream1.publicKey) });
        setHandshake();
      }
    });

    const stream2 = new ProtocolStream(false, {
      onhandshake: () => {
        log('onhandshake', { key: PublicKey.from(stream2.publicKey) });
        setHandshake();
      }
    });

    const [closed, setClosed] = latch({ count: 2 });
    const pipeline = stream1.pipe(stream2, setClosed).pipe(stream1, setClosed);

    await handshake();
    pipeline.destroy();
    await closed();
  });

  it('protocol stream handshake completes with feeds', async function () {
    //
    // Pipeline and handshake.
    //

    const [handshake, setHandshake] = latch({ count: 2 });

    const stream1 = new ProtocolStream(true, {
      onhandshake: () => {
        log('onhandshake', { key: PublicKey.from(stream1.publicKey) });
        setHandshake();
      }
    });

    const stream2 = new ProtocolStream(false, {
      onhandshake: () => {
        log('onhandshake', { key: PublicKey.from(stream2.publicKey) });
        setHandshake();
      }
    });

    const [streamClosed, setStreamClosed] = latch({ count: 2 });
    const pipeline = stream1
      .pipe(stream2, setStreamClosed)
      .pipe(stream1, setStreamClosed);

    await handshake();

    //
    // Hypercore replication.
    // https://github.com/hypercore-protocol/hypercore-protocol#const-channel--streamopenkey-handlers
    //

    const factory = new HypercoreFactory<string>();
    const { publicKey, secretKey } = createKeyPair();
    const core1 = factory.createFeed(publicKey, { secretKey });
    const core2 = factory.createFeed(publicKey);

    const [feedsClosed, setFeedClosed] = latch({ count: 2 });
    core1.once('close', setFeedClosed);
    core2.once('close', setFeedClosed);

    core1.replicate(true, { stream: stream1, live: true });
    core2.replicate(false, { stream: stream2, live: true });

    //
    // Extensions.
    //

    const [received, incMessage] = latch({ count: 2 });
    const extension1 = stream1.registerExtension('stream-extension', {
      onmessage: (msg: any) => {
        log('onmessage', {
          key: PublicKey.from(stream1.publicKey),
          msg: msg.toString()
        });
        incMessage();
      }
    });

    const extension2 = stream2.registerExtension('stream-extension', {
      onmessage: (msg: any) => {
        log('onmessage', {
          key: PublicKey.from(stream2.publicKey),
          msg: msg.toString()
        });
        incMessage();
      }
    });

    extension1.send(Buffer.from('message-1'));
    extension2.send(Buffer.from('message-2'));
    await received();

    //
    // Replication.
    //

    const [synced, setSynced] = latch({ count: 1 });

    {
      const numBlocks = 10;
      Array.from(Array(numBlocks)).forEach((_, i) => {
        core1.append(`block-${i}`, () => {});
      });

      core2.on('sync', () => {
        log('sync', {
          core: { key: PublicKey.from(core2.key), length: core2.length }
        });
        expect(core2.length).to.eq(numBlocks);
        setSynced();
      });
    }

    await synced();

    //
    // Close.
    //

    // Gracefully shutdown.
    pipeline.finalize();
    await streamClosed();

    // TODO(burdon): Destroy and finalize don't seem to close the feeds.
    expect(core1.closed).to.be.false;
    expect(core2.closed).to.be.false;

    core1.close(setFeedClosed);
    core2.close(setFeedClosed);
    await feedsClosed();

    expect(core1.closed).to.be.true;
    expect(core2.closed).to.be.true;
  });

  it('multi-feed multiplexing', async function () {
    //
    // Handshake.
    //

    const [handshake, setHandshake] = latch({ count: 2 });
    const stream1 = new ProtocolStream(true, { onhandshake: setHandshake });
    const stream2 = new ProtocolStream(false, { onhandshake: setHandshake });

    const [streamClosed, setStreamClosed] = latch({ count: 2 });
    const pipeline = stream1
      .pipe(stream2, setStreamClosed)
      .pipe(stream1, setStreamClosed);
    await handshake();

    //
    // Feeds.
    //

    const factory = new HypercoreFactory<string>();

    const numFeeds = 5;
    const [feedsClosed, setFeedClosed] = latch({ count: 2 * numFeeds });

    // Create set of feed pairs.
    const feeds = Array.from(Array(numFeeds)).map(() => {
      const { publicKey, secretKey } = createKeyPair();
      const core1 = factory.createFeed(publicKey, { secretKey });
      const core2 = factory.createFeed(publicKey);

      core1.once('close', setFeedClosed);
      core2.once('close', setFeedClosed);

      core1.replicate(true, { stream: stream1, live: true });
      core2.replicate(false, { stream: stream2, live: true });

      return [core1, core2];
    });

    //
    // Replicate.
    //

    let total = 0;
    const numBlocks = 100;
    const [synced, setSynced] = latch({ count: numFeeds });
    feeds.forEach(([, core2]) => {
      core2.on('sync', () => {
        core2.audit((_, data) => {
          total += data.valid;
          log('synced', { data });
          setSynced();
        });
      });
    });

    Array.from(Array(numBlocks)).forEach((_, i) => {
      const [core1] = faker.random.arrayElement(feeds);
      core1.append(`block-${i}`, () => {});
    });

    await synced();
    expect(total).to.eq(numBlocks);

    //
    // Close.
    //

    pipeline.finalize();
    await streamClosed();

    feeds.forEach(([core1, core2]) => {
      core1.close();
      core2.close();
    });

    await feedsClosed();
  });
});
