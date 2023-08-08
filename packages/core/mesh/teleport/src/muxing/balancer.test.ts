//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import * as varint from 'varint';

import { describe, test } from '@dxos/test';

import { encodeChunk, decodeChunk } from './balancer';

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
});
