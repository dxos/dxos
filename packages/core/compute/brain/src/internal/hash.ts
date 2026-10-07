//
// Copyright 2026 DXOS.org
//

/** JSON with sorted keys and no undefined fields, so equal content serializes identically. */
export const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

/** Two FNV-1a passes with different offsets: a 64-bit, deterministic, dependency-free content id. */
export const stableHash = (value: unknown): string => {
  const text = canonicalJson(value);
  let low = 0x811c9dc5;
  let high = 0xcbf29ce4;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    low = Math.imul(low ^ code, 0x01000193) >>> 0;
    high = Math.imul(high ^ code, 0x01000197) >>> 0;
  }
  return high.toString(16).padStart(8, '0') + low.toString(16).padStart(8, '0');
};
