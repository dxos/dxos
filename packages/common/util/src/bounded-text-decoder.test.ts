//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { makeBoundedTextDecoder } from './bounded-text-decoder.ts';

/** WebKit's Safari 18 `TextDecoder` accounting, with its `String::MaxLength` cap scaled down to `cap`. */
const makeWebKitTextDecoder = (cap: number): typeof TextDecoder =>
  class WebKitTextDecoder extends TextDecoder {
    #decodedBytes = 0;

    override decode(input?: AllowSharedBufferSource, options?: TextDecodeOptions): string {
      this.#decodedBytes += input?.byteLength ?? 0;
      if (this.#decodedBytes > cap) {
        throw new RangeError('Bad value');
      }
      return super.decode(input, options);
    }
  };

describe('makeBoundedTextDecoder', () => {
  test('keeps decoding past the per-instance cap of the native decoder', ({ expect }) => {
    const cap = 16;
    const WebKitTextDecoder = makeWebKitTextDecoder(cap);
    const chunk = new TextEncoder().encode('abcde');

    const native = new WebKitTextDecoder();
    expect(() => {
      for (let read = 0; read <= cap / chunk.byteLength; read++) {
        native.decode(chunk);
      }
    }).toThrow(RangeError);

    const bounded = new (makeBoundedTextDecoder(WebKitTextDecoder, cap / 2))();
    for (let read = 0; read < 100; read++) {
      expect(bounded.decode(chunk)).toBe('abcde');
    }
  });

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

  test('keeps the label and options of the decoder it replaces', ({ expect }) => {
    const decoder = new (makeBoundedTextDecoder(TextDecoder, 1))('utf-8', { fatal: true });
    expect(decoder.decode(new Uint8Array([0x61, 0x62]))).toBe('ab');
    expect(() => decoder.decode(new Uint8Array([0xff]))).toThrow(TypeError);
  });
});
