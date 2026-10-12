//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, test, vi } from 'vitest';

/** WebKit's `String::MaxLength`, the cap its TextDecoder compares a running byte count against. */
const WEBKIT_STRING_MAX_LENGTH = 2 ** 31 - 1;

/**
 * `TextDecoder::decode` as WebKit's safari-7619 to safari-7621 branches (Safari 18, the engine of a
 * macOS Tauri build) implement it: `m_decodedBytes` accumulates across every call on one instance,
 * streaming or not, and once it passes `String::MaxLength` every later call throws an empty-message
 * RangeError, which WebKit's bindings render as "Bad value". Safari 26 (7622) removed the check.
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
    { timeout: 300_000 },
    async ({ expect }) => {
      // The codec builds its decoder when its module loads, so the module loads after WebKit's is installed.
      vi.stubGlobal('TextDecoder', WebKitTextDecoder);
      vi.resetModules();
      const { EchoFeedCodec } = await import('./echo-feed-codec.ts');

      // One legitimate block read repeatedly: the fault is the decoder's running total, not a value.
      const body = 'x'.repeat(64 * 1024 * 1024);
      const data = EchoFeedCodec.encode({ id: 'object', body });
      const reads = Math.ceil(WEBKIT_STRING_MAX_LENGTH / data.byteLength) + 1;
      for (let read = 0; read < reads; read++) {
        const decoded = EchoFeedCodec.decodeBlock({ data, actorId: 'actor', sequence: read, position: read });
        expect(typeof decoded.body === 'string' ? decoded.body.length : decoded.body).toBe(body.length);
      }
    },
  );
});
