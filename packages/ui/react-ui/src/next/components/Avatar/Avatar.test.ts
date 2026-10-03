//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { toAvatarHue } from './Avatar.tsx';

describe('toAvatarHue', () => {
  test('a palette name is a hue; anything else is undefined', () => {
    expect(toAvatarHue('red')).toBe('red');
    expect(toAvatarHue('neutral')).toBe('neutral');
    expect(toAvatarHue('not-a-hue')).toBeUndefined();
    expect(toAvatarHue(undefined)).toBeUndefined();
  });
});
