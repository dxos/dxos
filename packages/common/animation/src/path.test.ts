//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { joinPath, matchSelector } from './path.ts';

describe('matchSelector', () => {
  test('segments, wildcards and alternatives', ({ expect }) => {
    expect(joinPath('', 'cloud', 's2')).toBe('cloud/s2');
    expect(matchSelector('home/phone')('home/phone')).toBe(true);
    expect(matchSelector('*')('home')).toBe(true);
    expect(matchSelector('*')('home/phone')).toBe(false);
    expect(matchSelector('ring-*')('ring-3')).toBe(true);
    expect(matchSelector('cloud/**')('cloud/a/b')).toBe(true);
    expect(matchSelector('cloud/**')('cloud')).toBe(false);
    expect(matchSelector('**')('anything/at/all')).toBe(true);
    expect(matchSelector('home, local-*')('local-2')).toBe(true);
    expect(matchSelector('a.b')('axb')).toBe(false);
  });
});
