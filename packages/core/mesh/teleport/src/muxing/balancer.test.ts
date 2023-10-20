//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { Duplex, pipeline } from 'node:stream';
import randomBytes from 'randombytes';
import * as varint from 'varint';

import { Trigger, sleep } from '@dxos/async';
import { describe, test } from '@dxos/test';

import { encodeChunk, decodeChunk, Balancer } from './balancer';

const createStuckStream = (): any => {
  const callbacks: any[] = [];
  const stream = new Duplex({
    write(chunk, encoding, callback) {
      // Simulate stuck stream.
      callbacks.push(() => {
        this.push(chunk);
        callback();
      });
    },

    read: (size) => {},
  });

  return { stream, callbacks };
};

const createStream = (): any => {
  const stream = new Duplex({
    write(chunk, encoding, callback) {
      this.push(chunk);
      callback();
    },

    read: (size) => {},
  });

  return { stream };
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

  it('should correctly encode and decode a chunk without dataLength', () => {
    const channelId = 1;
    const chunk = Uint8Array.from([0x11, 0x22, 0x33]);

    const encoded = encodeChunk({ chunk, channelId });
    const decoded = decodeChunk(encoded, () => false);

    expect(decoded.channelId).to.equal(channelId);
    expect(decoded.dataLength).to.equal(undefined);
    expect(decoded.chunk).to.deep.equal(chunk);
  });

  it('should correctly encode and decode a chunk with dataLength', () => {
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
    const balancer = new Balancer(0);

    const { stream, callbacks } = createStuckStream();

    balancer.addChannel(1);
    balancer.addChannel(2);
    balancer.addChannel(3);

    pipeline(balancer.stream, stream, () => {});

    for (let i = 1; i <= 3; i++) {
      for (let j = 0; j < 10; j++) {
        const chunk = Uint8Array.from(randomBytes(5_000));
        const trigger = new Trigger<void>();
        balancer.pushData(chunk, trigger, i);
      }
    }

    await sleep(50);

    expect(balancer.buffersCount).to.equal(3);

    for (const callback of callbacks) {
      callback();
    }
  });

  test('should not buffer when backpressure is not applied', async () => {
    const balancer = new Balancer(0);

    const { stream } = createStream();

    balancer.addChannel(1);
    balancer.addChannel(2);
    balancer.addChannel(3);

    pipeline(balancer.stream, stream, () => {});

    for (let i = 1; i <= 3; i++) {
      for (let j = 0; j < 10; j++) {
        const chunk = Uint8Array.from(randomBytes(5_000));
        const trigger = new Trigger<void>();
        balancer.pushData(chunk, trigger, i);
      }
    }

    await sleep(50);

    expect(balancer.buffersCount).to.equal(0);
  });
});
