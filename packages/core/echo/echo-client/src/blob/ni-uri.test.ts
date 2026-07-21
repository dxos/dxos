//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as NiUri from './ni-uri';

describe('ni-uri', () => {
  test('encode produces an RFC 6920 ni: URI', async ({ expect }) => {
    const bytes = new Uint8Array([1, 2, 3]);
    const uri = await NiUri.encode(bytes);
    expect(uri).toMatch(/^ni:\/\/\/sha-256;/);
    expect(uri).toBe(NiUri.fromDigest(await NiUri.digestBytes(bytes)));
  });

  test('fromDigestHex roundtrips through decode and digestHex', ({ expect }) => {
    const uri = NiUri.fromDigestHex('deadbeef');
    expect(uri).toBe('ni:///sha-256;3q2-7w');
    expect(NiUri.decode(uri)).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
    expect(NiUri.digestHex(uri)).toBe('deadbeef');
  });

  test('decode rejects an unknown hash algorithm', ({ expect }) => {
    expect(() => NiUri.decode('ni:///sha-512;abc')).toThrow(/Invalid ni: URI/);
  });

  test('decode rejects a malformed URI', ({ expect }) => {
    expect(() => NiUri.decode('not-a-uri')).toThrow(/Invalid ni: URI/);
  });
});
