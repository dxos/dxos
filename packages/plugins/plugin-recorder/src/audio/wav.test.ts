//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { concatPcm, encodeWav } from './wav.ts';

describe('wav', () => {
  test('clips join end to end; a mono clip fills both channels', ({ expect }) => {
    const pcm = concatPcm([
      { sampleRate: 48_000, channels: [new Float32Array([0.5, 0.5])] },
      { sampleRate: 48_000, channels: [new Float32Array([0.1]), new Float32Array([0.2])] },
    ]);
    expect(pcm.channels).toHaveLength(2);
    expect([...pcm.channels[0]].map((value) => +value.toFixed(2))).toEqual([0.5, 0.5, 0.1]);
    expect([...pcm.channels[1]].map((value) => +value.toFixed(2))).toEqual([0.5, 0.5, 0.2]);
  });

  test('encodes a 16-bit PCM header and samples', ({ expect }) => {
    const bytes = encodeWav({ sampleRate: 8000, channels: [new Float32Array([1, -1, 0])] });
    const view = new DataView(bytes.buffer);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe('RIFF');
    expect(new TextDecoder().decode(bytes.slice(8, 12))).toBe('WAVE');
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(8000);
    expect(view.getUint32(40, true)).toBe(6);
    expect([view.getInt16(44, true), view.getInt16(46, true), view.getInt16(48, true)]).toEqual([32767, -32768, 0]);
    expect(bytes.byteLength).toBe(50);
  });
});
