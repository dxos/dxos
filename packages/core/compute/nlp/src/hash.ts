//
// Copyright 2026 DXOS.org
//

/**
 * Fast non-cryptographic hash (FNV-1a, 32-bit) of source text. Used purely to detect whether an
 * analyzed span still matches the current editor text — change detection, not security.
 */
export const sourceHash = (text: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};
