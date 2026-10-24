//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { hasSlots, nextSlot, slotBefore } from './slots.ts';

describe('nextSlot', () => {
  test('follows the reading order of each layout and stops after the last region', () => {
    expect(nextSlot('two-cols', 'default')).toBe('right');
    expect(nextSlot('two-cols', 'right')).toBeUndefined();
    expect(nextSlot('two-cols-header', 'default')).toBe('left');
    expect(nextSlot('three-cols', 'default')).toBe('middle');
    expect(nextSlot('three-cols', 'middle')).toBe('right');
    expect(nextSlot('two-by-two', 'right')).toBe('bottom-left');
    expect(nextSlot('two-by-two', 'bottom-left')).toBe('bottom-right');
    expect(nextSlot('two-by-two', 'bottom-right')).toBeUndefined();
  });

  test('a `::left::` region counts as the first one where the layout has no `left` slot', () => {
    expect(nextSlot('three-cols', 'left')).toBe('middle');
    expect(nextSlot('two-cols-header', 'left')).toBe('right');
  });

  test('content before any marker is the first region; single-region layouts have none to add', () => {
    expect(nextSlot('two-by-two', undefined)).toBe('right');
    expect(nextSlot('cover', 'default')).toBeUndefined();
    expect(hasSlots('cover')).toBe(false);
    expect(hasSlots('three-cols')).toBe(true);
  });
});

describe('slotBefore', () => {
  const content = [
    '---',
    'layout: three-cols',
    '---',
    '',
    'One',
    '',
    '::middle::',
    '',
    'Two',
    '',
    '',
    '```',
    '::right::',
    '```',
  ].join('\n');

  test('the last marker before the caret, even on a blank line or the marker line', () => {
    expect(slotBefore(content, content.indexOf('One'))).toBeUndefined();
    expect(slotBefore(content, content.indexOf('Two') + 4)).toBe('middle');
    expect(slotBefore(content, content.indexOf('::middle::') + 10)).toBe('middle');
  });

  test('a marker inside fenced code is text, not a region', () => {
    expect(slotBefore(content, content.length)).toBe('middle');
  });
});
