//
// Copyright 2023 DXOS.org
//

import randomBytes from 'randombytes';
import varint from 'varint';
import { describe, expect, test } from 'vitest';

import { Trigger, sleep } from '@dxos/async';

import { Balancer, decodeChunk, encodeChunk } from './balancer.ts';

/**
 * A sink whose first write can be held open indefinitely, so the test can observe the balancer
 * buffering behind real backpressure rather than a timing coincidence.
 */
class StuckableSink {
  public unstuck: (() => void) | undefined;
  public writeCalls = 0;
  public readonly writable: WritableStream<Uint8Array>;

  constructor(private _stuck: boolean) {
    this.writable = new WritableStream<Uint8Array>({
      write: async () => {
        this.writeCalls++;
        if (this._stuck) {
          await new Promise<void>((resolve) => {
            this.unstuck = () => {
              this._stuck = false;
              resolve();
            };
          });
        }
      },
    });
  }
}

const setupBalancer = (channels: number, stuck: boolean): { balancer: Balancer; stream: StuckableSink } => {
  const balancer = new Balancer(0);
  const stream = new StuckableSink(stuck);

  void balancer.stream.readable.pipeTo(stream.writable).catch(() => {});

  let i = 1;
  for (i; i <= channels; i++) {
    balancer.addChannel(i);
    for (let j = 0; j < 10; j++) {
      const chunk = Uint8Array.from(randomBytes(5_000));
      const trigger = new Trigger<void>();
      balancer.pushData(chunk, trigger, i);
    }
  }

  return { balancer, stream };
};

describe('Balancer', () => {
  test('varints', () => {
    const values = [0, 1, 5, 127, 128, 255, 256, 257, 1024, 1024 * 1024];
    for (const value of values) {
      const encoded = varint.encode(value, new Uint8Array(4)).slice(0, varint.encode.bytes);
      const length = varint.encode.bytes;
      expect(encoded.length).to.eq(length);

      const decoded = varint.decode(encoded);
      expect(decoded).to.equal(value);
      expect(varint.decode.bytes).to.equal(length);
    }
  });

  test('should correctly encode and decode a chunk without dataLength', () => {
    const channelId = 1;
    const chunk = Uint8Array.from([0x11, 0x22, 0x33]);

    const encoded = encodeChunk({ chunk, channelId });
    const decoded = decodeChunk(encoded, () => false);

    expect(decoded.channelId).to.equal(channelId);
    expect(decoded.dataLength).to.equal(undefined);
    expect(decoded.chunk).to.deep.equal(chunk);
  });

  test('should correctly encode and decode a chunk with dataLength', () => {
    const channelId = 2;
    const chunk = Uint8Array.from([0x44, 0x55, 0x66]);
    const dataLength = chunk.length;

    const encoded = encodeChunk({ chunk, channelId, dataLength });
    const decoded = decodeChunk(encoded, (channelId) => channelId === 2);

    expect(decoded.channelId).to.equal(channelId);
    expect(decoded.dataLength).to.equal(dataLength);
    expect(decoded.chunk).to.deep.equal(chunk);
  });

  test('should buffer chunks on the balancer for separate channels', async () => {
    const channels = 3;
    const { balancer, stream } = setupBalancer(channels, true);

    // Poll until the first (stuck) write lands and the remaining chunks are buffered behind backpressure.
    await expect.poll(() => stream.writeCalls).toEqual(1);
    expect(balancer.buffersCount).to.toBeGreaterThan(0);

    stream.unstuck?.();

    await expect.poll(() => balancer.buffersCount).toEqual(0);
  });

  test('should not buffer when backpressure is not applied', async () => {
    const channels = 3;
    const { balancer } = setupBalancer(channels, false);

    await sleep(20);

    expect(balancer.buffersCount).to.equal(0);
  });

  test('settles queued sends when the peer hangs up mid-backpressure', async () => {
    const balancer = new Balancer(0);
    const writer = balancer.stream.writable.getWriter();

    // Nobody reads the readable, so these queue behind the framer's high-water mark.
    const triggers = Array.from({ length: 40 }, () => new Trigger());
    for (const trigger of triggers) {
      balancer.pushData(new Uint8Array(8192), trigger, 0);
    }

    // The inbound pipe ending is how a peer hanging up reaches the framer. Every queued send has to
    // settle: a sender parked on `drain` would otherwise wait for a readable that can never pull.
    await writer.close();

    const settled = await Promise.race([
      Promise.allSettled(triggers.map((trigger) => trigger.wait())).then(() => true),
      sleep(2_000).then(() => false),
    ]);
    expect(settled).to.equal(true);
  });
});
