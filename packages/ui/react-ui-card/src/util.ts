//
// Copyright 2026 DXOS.org
//

/** Deterministic string hash (djb2), used to map a name to a stable avatar hue. */
export const hashString = (str?: string): number =>
  str ? Math.abs(str.split('').reduce((hash, char) => (hash << 5) + hash + char.charCodeAt(0), 0)) : 0;
