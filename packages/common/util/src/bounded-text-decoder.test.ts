//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { makeBoundedTextDecoder } from './bounded-text-decoder.ts';

describe('makeBoundedTextDecoder', () => {
  test('replaces its native decoder before the budget, but never mid-stream', ({ expect }) => {
    const instances: Array<TextDecoder> = [];
    class CountingTextDecoder extends TextDecoder {
      constructor(label?: string, options?: TextDecoderOptions) {
        super(label, options);
        instances.push(this);
      }
    }
    const decoder = new (makeBoundedTextDecoder(CountingTextDecoder, 4))();
    const euro = new TextEncoder().encode('€');

    expect(decoder.decode(new TextEncoder().encode('abc'))).toBe('abc');
    // Over budget but streaming: the split sequence must reach the decoder holding its first bytes.
    expect(decoder.decode(euro.subarray(0, 2), { stream: true })).toBe('');
    expect(decoder.decode(euro.subarray(2))).toBe('€');
    const beforeRotation = instances.length;
    expect(decoder.decode(new TextEncoder().encode('defg'))).toBe('defg');
    expect(instances.length).toBe(beforeRotation + 1);
  });
});
