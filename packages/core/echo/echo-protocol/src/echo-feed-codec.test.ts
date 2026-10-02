//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, test, vi } from 'vitest';

/** WebKit's `String::MaxLength`, the cap its TextDecoder compares a running byte count against. */
const WEBKIT_STRING_MAX_LENGTH = 2 ** 31 - 1;

/**
 * `TextDecoder::decode` as Safari 18 (WebKit safari-7619 to safari-7621) implements it: bytes
 * accumulate across every call on one instance, and past `String::MaxLength` every call throws.
 */
class WebKitTextDecoder extends TextDecoder {
  #decodedBytes = 0;

  override decode(input?: AllowSharedBufferSource, options?: TextDecodeOptions): string {
    this.#decodedBytes += input?.byteLength ?? 0;
    if (this.#decodedBytes > WEBKIT_STRING_MAX_LENGTH) {
      throw new RangeError('Bad value');
    }
    return super.decode(input, options);
  }
}

describe('EchoFeedCodec', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test(
    'keeps decoding blocks after 2 GiB under WebKit TextDecoder accounting',
    { timeout: 120_000 },
    async ({ expect }) => {
      vi.stubGlobal('TextDecoder', WebKitTextDecoder);
      // The codec holds one decoder for the life of the module, so it must be loaded under the stub.
      vi.resetModules();
      const { EchoFeedCodec } = await import('./echo-feed-codec.ts');

      const body = 'x'.repeat(64 * 1024 * 1024);
      const block = EchoFeedCodec.encode({ id: 'object', body });
      const reads = Math.ceil(WEBKIT_STRING_MAX_LENGTH / block.byteLength) + 1;
      for (let read = 0; read < reads; read++) {
        expect(EchoFeedCodec.decode(block).body).toHaveLength(body.length);
      }
    },
  );
});
