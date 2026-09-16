//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { ATMOSPHERE_METHOD, METHOD_ALIASES } from './util.ts';

describe('method aliases', () => {
  test('atproto resolves to the canonical Atmosphere method', () => {
    expect(METHOD_ALIASES.atproto).toBe(ATMOSPHERE_METHOD);
  });
});
