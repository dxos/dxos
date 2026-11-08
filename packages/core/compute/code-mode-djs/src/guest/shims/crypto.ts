//
// Copyright 2026 DXOS.org
//

/** `node:crypto` as `@dxos/keys` reaches for it when no web crypto exists: the guest polyfills one. */
export const webcrypto = globalThis.crypto;

export default { webcrypto };
