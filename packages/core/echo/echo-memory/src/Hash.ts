//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

/** Stable content hash of a text (FNV-1a), with no crypto dependency so it runs the same everywhere. */
export const text = (text: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
};
