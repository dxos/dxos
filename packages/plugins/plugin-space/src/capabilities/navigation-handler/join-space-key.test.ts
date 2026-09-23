//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { PublicKey } from '@dxos/keys';

import { readJoinSpaceKey } from './join-space-key.ts';

describe('readJoinSpaceKey', () => {
  test('reads a valid key', () => {
    const key = PublicKey.random();
    expect(readJoinSpaceKey(new URL(`https://x/?spaceKey=${key.toHex()}`), 'spaceKey')?.equals(key)).toBe(true);
  });

  test('ignores missing and malformed values', () => {
    expect(readJoinSpaceKey(new URL('https://x/'), 'spaceKey')).toBeUndefined();
    expect(readJoinSpaceKey(new URL('https://x/?spaceKey=nope'), 'spaceKey')).toBeUndefined();
  });
});
