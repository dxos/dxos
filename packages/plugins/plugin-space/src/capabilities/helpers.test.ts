//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { PublicKey } from '@dxos/keys';

import { makeCreateJoinUrl } from './helpers.ts';

describe('makeCreateJoinUrl', () => {
  test('puts the space key in the spaceKey param', () => {
    const key = PublicKey.random();
    const url = new URL(makeCreateJoinUrl({ shareableLinkOrigin: 'https://composer.space' })(key));
    expect(url.origin).toBe('https://composer.space');
    expect(url.searchParams.get('spaceKey')).toBe(key.toHex());
  });
});
