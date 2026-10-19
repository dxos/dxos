//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { getHashHue, getHueOrHash, toHue } from './hash-styles.ts';

describe('getHueOrHash', () => {
  test('keeps a hue from the palette', ({ expect }) => {
    expect(getHueOrHash('red', 'space')).toBe('red');
    expect(getHueOrHash('neutral', 'space')).toBe('neutral');
  });

  test('hashes the id when there is no hue, or one outside the palette', ({ expect }) => {
    expect(getHueOrHash(undefined, 'space')).toBe(getHashHue('space'));
    expect(getHueOrHash('not-a-hue', 'space')).toBe(getHashHue('space'));
  });
});

describe('toHue', () => {
  test('falls back to neutral outside the palette', ({ expect }) => {
    expect(toHue('red')).toBe('red');
    expect(toHue('not-a-hue')).toBe('neutral');
    expect(toHue(undefined)).toBe('neutral');
  });
});
