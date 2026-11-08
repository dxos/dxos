//
// Copyright 2026 DXOS.org
//

import { host } from './host.ts';

/**
 * The web globals the bundled libraries reach for and djs does not define. Imported first by the
 * entry, so they exist before any library module initializes.
 */

type TimerHandle = { cancelled: boolean };

const setTimeoutPolyfill = (callback: (...args: unknown[]) => void, ms?: number, ...args: unknown[]): TimerHandle => {
  const handle: TimerHandle = { cancelled: false };
  // The VM has no clock of its own to wait on, so the host waits.
  void host()
    .sleep(ms ?? 0)
    .then(() => {
      if (!handle.cancelled) {
        callback(...args);
      }
    });
  return handle;
};

const clearTimeoutPolyfill = (handle?: TimerHandle): void => {
  if (handle) {
    handle.cancelled = true;
  }
};

/** UTF-8 only: what ECHO and Effect encode, and all TextEncoder supports anyway. */
class TextEncoderPolyfill {
  get encoding(): string {
    return 'utf-8';
  }

  encode(input = ''): Uint8Array {
    const bytes: number[] = [];
    for (const char of String(input)) {
      const code = char.codePointAt(0) ?? 0;
      if (code < 0x80) {
        bytes.push(code);
      } else if (code < 0x800) {
        bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
      } else if (code < 0x10000) {
        bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
      } else {
        bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
      }
    }
    return new Uint8Array(bytes);
  }
}

class TextDecoderPolyfill {
  get encoding(): string {
    return 'utf-8';
  }

  decode(input?: ArrayBufferView | ArrayBuffer): string {
    if (!input) {
      return '';
    }
    const bytes =
      input instanceof Uint8Array
        ? input
        : ArrayBuffer.isView(input)
          ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
          : new Uint8Array(input);
    let text = '';
    for (let index = 0; index < bytes.length;) {
      let code = bytes[index++];
      if (code >= 0xf0) {
        code =
          ((code & 7) << 18) | ((bytes[index++] & 63) << 12) | ((bytes[index++] & 63) << 6) | (bytes[index++] & 63);
      } else if (code >= 0xe0) {
        code = ((code & 15) << 12) | ((bytes[index++] & 63) << 6) | (bytes[index++] & 63);
      } else if (code >= 0xc0) {
        code = ((code & 31) << 6) | (bytes[index++] & 63);
      }
      text += String.fromCodePoint(code);
    }
    return text;
  }
}

/** Ids only: ECHO draws object ids from it. djs seeds `Math.random` from the host's crypto. */
const cryptoPolyfill = {
  getRandomValues: <T extends ArrayBufferView>(array: T): T => {
    const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    for (let index = 0; index < bytes.length; index++) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
    return array;
  },
};

const missing = (name: string) => !(name in globalThis);

if (missing('setTimeout')) {
  Object.assign(globalThis, {
    setTimeout: setTimeoutPolyfill,
    clearTimeout: clearTimeoutPolyfill,
    setInterval: () => {
      throw new Error('setInterval is not available in the sandbox.');
    },
    clearInterval: () => {},
  });
}
if (missing('TextEncoder')) {
  Object.assign(globalThis, { TextEncoder: TextEncoderPolyfill, TextDecoder: TextDecoderPolyfill });
}
if (missing('crypto')) {
  Object.assign(globalThis, { crypto: cryptoPolyfill });
}
