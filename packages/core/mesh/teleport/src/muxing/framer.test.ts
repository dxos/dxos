//
// Copyright 2022 DXOS.org
//

import randomBytes from 'randombytes';
import { describe, expect, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { concatUint8Arrays } from '@dxos/util';

import { type DuplexStream, connectDuplexStreams, readAll } from './duplex-stream.ts';
import { Framer, decodeFrame, encodeFrame } from './framer.ts';

/**
 * Re-chunks the byte flow at random boundaries, so framing is exercised against splits that do not
 * line up with frames — which is the whole point of this test.
 */
const pipeWithRandomizedChunks = (from: ReadableStream<Uint8Array>, to: WritableStream<Uint8Array>): (() => void) => {
  let buffers: Uint8Array[] = [];
  const writer = to.getWriter();

  // The read rejects when the test finishes and cancels the pipe.
  void readAll(from, (data) => buffers.push(data)).catch(() => {});

  // Flush data every millisecond.
  const intervalId = setInterval(() => {
    const buffer = concatUint8Arrays(...buffers);
    buffers = [];

    let offset = 0;
    while (offset < buffer.length) {
      const chunkLength = Math.min(Math.floor(Math.random() * buffer.length * 1.2) + 1, buffer.length - offset);
      void writer.write(buffer.subarray(offset, offset + chunkLength));
      offset += chunkLength;
    }
  }, 1);

  return () => {
    clearInterval(intervalId);
    void writer.close().catch(() => {});
  };
};

const pipe = (a: DuplexStream, b: DuplexStream): (() => void) => {
  const cleanA = pipeWithRandomizedChunks(a.readable, b.writable);
  const cleanB = pipeWithRandomizedChunks(b.readable, a.writable);
  return () => {
    cleanA();
    cleanB();
  };
};

describe('Framer', () => {
  test('frame encoding', () => {
    const sizes = [0, 1, 5, 127, 128, 255, 256, 257, 1024, 1024 * 60];
    for (const size of sizes) {
      const payload = randomBytes(size);
      const frame = encodeFrame(payload);
      const decoded = decodeFrame(frame, 0);
      expect(decoded?.bytesConsumed).to.equal(frame.length);
      expect(decoded?.payload).to.deep.equal(payload);
    }
  });

  // This test is a bit slow because of sleep and flush on interval.
  test('end-to-end stress test', async () => {
    const peer1 = new Framer();
    const peer2 = new Framer();

    const clean = pipe(peer1.stream, peer2.stream);
    onTestFinished(clean);

    // Peer 1 loops messages back to peer 2.
    peer1.port.subscribe((message) => {
      // console.log('lo', message.length)
      void peer1.port.send(message);
    });

    const framesSent: Uint8Array[] = [];
    const framesReceived: Uint8Array[] = [];
    let subscribed = false;

    // console.log('Start sending frames\n=================\n')

    const TOTAL_FRAMES = 1000;
    while (framesSent.length < TOTAL_FRAMES) {
      for (let i = 0; i < 3; i++) {
        const frame = randomBytes(Math.floor(Math.random() * 400));
        // console.log('wrt', frame.length)
        void peer2.port.send(frame);
        framesSent.push(frame);
      }

      if (Math.random() < 0.1) {
        // 10% chance to pause and check the messages.
        await sleep(2);

        if (!subscribed) {
          // Simulate subscription delay
          subscribed = true;
          // console.log("subscribing")
          peer2.port.subscribe((message) => {
            // console.log('rcv', message.length)
            framesReceived.push(new Uint8Array(message));
          });
        }

        // Wait until every sent frame has been delivered rather than guessing the pipe's flush interval.
        await expect.poll(() => framesReceived.length).toEqual(framesSent.length);
        for (const i in framesSent) {
          expect(framesReceived[i]).to.deep.eq(framesSent[i], `Frame ${i} does not match`);
        }
        // console.log('Synced\n=================\n')
      }
    }
  });

  test('bench', async () => {
    const peer1 = new Framer();
    const peer2 = new Framer();

    connectDuplexStreams(peer1.stream, peer2.stream);

    // Peer 1 loops messages back to peer 2.
    peer1.port.subscribe((message) => {
      void peer1.port.send(message);
    });

    const framesSent: Uint8Array[] = [];
    const framesReceived: Uint8Array[] = [];
    peer2.port.subscribe((message) => {
      framesReceived.push(new Uint8Array(message));
    });

    const TOTAL_FRAMES = 1000;
    while (framesSent.length < TOTAL_FRAMES) {
      const frame = randomBytes(Math.floor(Math.random() * 400));
      void peer2.port.send(frame);
      framesSent.push(frame);
    }

    await expect.poll(() => framesReceived.length).toEqual(framesSent.length);
    for (const i in framesSent) {
      expect(framesReceived[i]).to.deep.eq(framesSent[i], `Frame ${i} does not match`);
    }
  });
});
