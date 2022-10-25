//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';
import ProtocolStream from 'hypercore-protocol';

import { latch } from '@dxos/async';
import { createKeyPair } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { HypercoreFactory } from './hypercore-factory';

describe.only('hypercore-protocol', function () {
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

  // TODO(burdon): Document sections.

  it('protocol stream handshake completes with feeds', async function () {
    const factory = new HypercoreFactory<string>();

    const { publicKey, secretKey } = createKeyPair();
    const core1 = factory.createFeed(publicKey, { secretKey });
    const core2 = factory.createFeed(publicKey);

    //
    // Handshake.
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

    //
    // Hypercore replication.
    //

    core1.replicate(true, { stream: stream1, live: true });
    core2.replicate(false, { stream: stream2, live: true });

    const { publicKey: topic } = createKeyPair();

    //
    // Streams.
    // https://github.com/hypercore-protocol/hypercore-protocol#const-channel--streamopenkey-handlers
    //

    const [initialized, inc] = latch({ count: 4 });

    const channel1 = stream1.open(topic, {
      onoptions: (msg: any) => {
        log('onoptions', { key: PublicKey.from(stream1.publicKey), msg });
        inc();
      },
      // TODO(burdon): What is id?
      onextension: (id: any, data: Buffer) => {
        log('onextension', { key: PublicKey.from(stream1.publicKey), id, data: String(data) });
        inc();
      }
    });

    const channel2 = stream2.open(topic, {
      onoptions: (msg: any) => {
        log('onoptions', { key: PublicKey.from(stream2.publicKey), msg });
        inc();
      },
      onextension: (id: any, data: Buffer) => {
        log('onextension', { key: PublicKey.from(stream2.publicKey), id, data: String(data) });
        inc();
      }
    });

    //
    // Channels.
    //

    channel1.extension(0, Buffer.from('ext-1'));
    channel1.options({ // TODO(burdon): What is this?
      extensions: [
        'channel-extension'
      ]
    });

    channel2.extension(0, Buffer.from('ext-2'));
    channel2.options({
      extensions: [
        'channel-extension'
      ]
    });

    //
    // Extensions.
    // TODO(burdon): Channel extension vs. registerExtension.
    //

    const [received, incMessage] = latch({ count: 2 });

    const extension1 = stream1.registerExtension('stream-extension', {
      onmessage: (msg: any) => {
        log('onmessage', { key: PublicKey.from(stream1.publicKey), msg: msg.toString() });
        incMessage();
      }
    });

    const extension2 = stream2.registerExtension('stream-extension', {
      onmessage: (msg: any) => {
        log('onmessage', { key: PublicKey.from(stream2.publicKey), msg: msg.toString() });
        incMessage();
      }
    });

    const [streamClosed, setStreamClosed] = latch({ count: 2 });
    const pipeline = stream1.pipe(stream2, setStreamClosed).pipe(stream1, setStreamClosed);

    await handshake();
    await initialized();

    extension1.send(Buffer.from('message-1'));
    extension2.send(Buffer.from('message-2'));
    await received();

    //
    // Replication.
    //

    const [synced, setSync] = latch({ count: 1 });
    {
      const numMessages = 10;
      Array.from(Array(numMessages)).forEach((_, i) => {
        core1.append(`block-${i}`, () => {});
      });

      core2.on('sync', () => {
        log('sync', { core: { key: PublicKey.from(core2.key), length: core2.length } });
        expect(core2.length).to.eq(numMessages);
        setSync();
      });
    }
    await synced();

    //
    // Destroy and close.
    //

    // Gracefully shutdown (doesn't close feeds).
    pipeline.finalize();
    await streamClosed();

    {
      // NOTE: Feeds not closed since graceful shutdown via `finalize` above.
      const [feedsClosed, setFeedClosed] = latch({ count: 2 });
      core1.close(setFeedClosed);
      core2.close(setFeedClosed);
      await feedsClosed();

      expect(core1.closed).to.be.true;
      expect(core2.closed).to.be.true;
    }
  });
});
