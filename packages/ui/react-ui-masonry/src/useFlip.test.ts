//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { shouldAnimateReflow } from './useFlip';

describe('shouldAnimateReflow', () => {
  test('animates a small add', ({ expect }) => {
    expect(shouldAnimateReflow({ added: 1, removed: 0, resized: false })).toBe(true);
  });

  test('animates a small remove', ({ expect }) => {
    expect(shouldAnimateReflow({ added: 0, removed: 2, resized: false })).toBe(true);
  });

  test('snaps the initial bulk render', ({ expect }) => {
    expect(shouldAnimateReflow({ added: 36, removed: 0, resized: false })).toBe(false);
  });

  test('snaps a height-settling reflow (no add/remove)', ({ expect }) => {
    expect(shouldAnimateReflow({ added: 0, removed: 0, resized: false })).toBe(false);
  });

  test('snaps on resize even for a small delta', ({ expect }) => {
    expect(shouldAnimateReflow({ added: 1, removed: 0, resized: true })).toBe(false);
  });

  test('snaps at the delta boundary and animates just below it', ({ expect }) => {
    expect(shouldAnimateReflow({ added: 4, removed: 4, resized: false, maxDelta: 8 })).toBe(true);
    expect(shouldAnimateReflow({ added: 5, removed: 4, resized: false, maxDelta: 8 })).toBe(false);
  });
});
