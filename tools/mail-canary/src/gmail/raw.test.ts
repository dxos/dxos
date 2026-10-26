//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { decodeRaw, encodeRaw } from './raw.ts';

describe('raw', () => {
  test('round-trips 8-bit bodies through base64url', ({ expect }) => {
    const message = 'Subject: caf\xe9\r\n\r\nna\xefve body \xff';
    expect(decodeRaw(encodeRaw(message))).toBe(message);
  });
});
