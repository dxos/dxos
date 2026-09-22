//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { fnv1a32, fnv1a64 } from './hash.ts';

describe('hash', () => {
  test('fnv1a32 matches the reference vectors', ({ expect }) => {
    // From the FNV reference implementation; a drifting constant or a sign slip breaks these.
    expect(fnv1a32('')).toBe(0x811c9dc5);
    expect(fnv1a32('a')).toBe(0xe40c292c);
    expect(fnv1a32('foobar')).toBe(0xbf9cf968);
  });

  test('fnv1a32 is unsigned, so a modulus never indexes backwards', ({ expect }) => {
    // The top bit is set for a good half of all inputs; a signed result would index an array
    // negatively rather than wrapping.
    const values = Array.from({ length: 500 }, (_, index) => fnv1a32(`seed-${index}`));
    expect(values.every((value) => value >= 0 && Number.isInteger(value))).toBe(true);
    expect(values.some((value) => value > 0x7fffffff)).toBe(true);
  });

  test('fnv1a64 is 16 hex characters, zero-padded', ({ expect }) => {
    expect(fnv1a64('')).toBe('cbf29ce484222325');
    expect(fnv1a64('a')).toBe('af63dc4c8601ec8c');
    expect(fnv1a64('foobar')).toBe('85944171f73967e8');
    expect(fnv1a64('anything').length).toBe(16);
  });

  test('both are deterministic and sensitive to a single character', ({ expect }) => {
    expect(fnv1a32('payload')).toBe(fnv1a32('payload'));
    expect(fnv1a64('payload')).toBe(fnv1a64('payload'));
    expect(fnv1a32('payload')).not.toBe(fnv1a32('payloaD'));
    expect(fnv1a64('payload')).not.toBe(fnv1a64('payloaD'));
  });

  test('fnv1a64 does not collide across a wide span of similar inputs', ({ expect }) => {
    // The width is the whole point: it is the difference between "changed entity re-indexed" and
    // "changed entity silently skipped".
    const digests = new Set(Array.from({ length: 20_000 }, (_, index) => fnv1a64(`entry-${index}`)));
    expect(digests.size).toBe(20_000);
  });
});
