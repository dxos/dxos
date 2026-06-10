//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { minImportedPayloadBytes } from './opfs-import-verify';

describe('minImportedPayloadBytes', () => {
  test('never exceeds source file size', () => {
    const source = new Uint8Array(745_472);
    expect(minImportedPayloadBytes(source)).toBeLessThanOrEqual(source.byteLength);
  });

  test('accepts mid-size profiles that previously failed the 1MB floor', () => {
    const source = new Uint8Array(745_472);
    expect(source.byteLength).toBeGreaterThanOrEqual(minImportedPayloadBytes(source));
  });

  test('caps floor at 1MB for very large sources', () => {
    const source = new Uint8Array(10_000_000);
    expect(minImportedPayloadBytes(source)).toBe(1_000_000);
  });
});
