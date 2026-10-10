//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Avatar from './Avatar.tsx';

describe('toAvatarHue', () => {
  test('a palette name is a hue; anything else is undefined', () => {
    expect(Avatar.toAvatarHue('red')).toBe('red');
    expect(Avatar.toAvatarHue('neutral')).toBe('neutral');
    expect(Avatar.toAvatarHue('not-a-hue')).toBeUndefined();
    expect(Avatar.toAvatarHue(undefined)).toBeUndefined();
  });
});
