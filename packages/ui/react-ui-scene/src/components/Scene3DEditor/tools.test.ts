//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { clickSelects, orbitButtons } from './tools.ts';

describe('tools', () => {
  test('the orbit tool gives the left button to the orbit; every other tool keeps it', () => {
    expect(orbitButtons('orbit')).toBe('all');
    expect(orbitButtons('select')).toBe('secondary');
    expect(orbitButtons('move')).toBe('secondary');
    expect(orbitButtons({ create: 'cube' })).toBe('secondary');
  });

  test('a click with the orbit tool selects nothing', () => {
    expect(clickSelects('orbit')).toBe(false);
    expect(clickSelects('select')).toBe(true);
  });
});
