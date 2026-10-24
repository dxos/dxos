//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { hasSlots, nextSlot } from './slots.ts';

describe('nextSlot', () => {
  test('follows the reading order of each layout and stops after the last region', () => {
    expect(nextSlot('two-cols', 'default')).toBe('right');
    expect(nextSlot('two-cols', 'right')).toBeUndefined();
    expect(nextSlot('two-cols-header', 'default')).toBe('left');
    expect(nextSlot('three-cols', 'default')).toBe('middle');
    expect(nextSlot('three-cols', 'middle')).toBe('right');
    expect(nextSlot('grid', 'right')).toBe('bottom-left');
    expect(nextSlot('grid', 'bottom-left')).toBe('bottom-right');
    expect(nextSlot('grid', 'bottom-right')).toBeUndefined();
  });

  test('a `::left::` region counts as the first one where the layout has no `left` slot', () => {
    expect(nextSlot('three-cols', 'left')).toBe('middle');
    expect(nextSlot('two-cols-header', 'left')).toBe('right');
  });

  test('content before any marker is the first region; single-region layouts have none to add', () => {
    expect(nextSlot('grid', undefined)).toBe('right');
    expect(nextSlot('cover', 'default')).toBeUndefined();
    expect(hasSlots('cover')).toBe(false);
    expect(hasSlots('three-cols')).toBe(true);
  });
});
