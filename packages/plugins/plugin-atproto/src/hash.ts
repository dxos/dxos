//
// Copyright 2026 DXOS.org
//

/**
 * Deterministic canonical JSON: object keys sorted recursively so semantically-equal records hash
 * identically regardless of key order.
 */
export const canonicalStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalStringify).join(',')}]`;
  }
  const entries = Object.entries(value)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, val]) => `${JSON.stringify(key)}:${canonicalStringify(val)}`).join(',')}}`;
};

/** FNV-1a 32-bit hash of the canonical JSON, as an 8-char hex string. */
export const hashRecord = (record: Record<string, unknown>): string => {
  const input = canonicalStringify(record);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};
