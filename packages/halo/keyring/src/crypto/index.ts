import * as nodeCrypto from 'node:crypto';

// TODO(dmaretskyi): Extract to @dxos/crypto.
export const subtleCrypto = nodeCrypto.webcrypto.subtle;