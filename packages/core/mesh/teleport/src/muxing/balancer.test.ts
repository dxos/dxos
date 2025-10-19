//
// Copyright 2023 DXOS.org
//

import { Duplex, pipeline } from 'node:stream';

import randomBytes from 'randombytes';
import varint from 'varint';
import { describe, expect, test } from 'vitest';

import { Trigger, sleep } from '@dxos/async';

import { Balancer, decodeChunk, encodeChunk } from './balancer';

class StuckableStream extends Duplex {
  public unstuck: Function | undefined;
  public writeCalls = 0;

  constructor(private _stuck: boolean) {
    super();
  }

  override _write(chunk: Buffer, encoding: string, callback: Function): void {
    this.writeCalls++;
    if (this._stuck) {
      this.unstuck = () => {
        this._stuck = false;
        this.push(chunk);
        callback();
      };
    } else {
      this.push(chunk);
      callback();
    }
  }

  override _read(size: number): void {}
}

const setupBalancer = (channels: number, stuck: boolean): { balancer: Balancer; stream: StuckableStream } => {
  const balancer = new Balancer(0);
  const stream = new StuckableStream(stuck);

  pipeline(balancer.stream, stream, () => {});

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
      const encoded = varint.encode(value, Buffer.allocUnsafe(4)).slice(0, varint.encode.bytes);
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

    await sleep(20);

    expect(stream.writeCalls).to.equal(1);
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
});
