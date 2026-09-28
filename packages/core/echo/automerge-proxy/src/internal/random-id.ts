//
// Copyright 2026 DXOS.org
//

/** Hex from the platform's random source, which browsers and Node both provide as `crypto`. */
export const randomId = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
