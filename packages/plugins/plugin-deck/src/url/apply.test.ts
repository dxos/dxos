//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { resolveScrollIntoView } from './apply.ts';

describe('resolveScrollIntoView', () => {
  test('is undefined with no options and nothing displaced', ({ expect }) => {
    expect(resolveScrollIntoView(undefined)).toBeUndefined();
  });

  test('is undefined when toAttend is set but nothing asked for it', ({ expect }) => {
    expect(resolveScrollIntoView('plank-1')).toBeUndefined();
  });

  test('an explicit id wins even when nothing was displaced', ({ expect }) => {
    expect(resolveScrollIntoView(undefined, { scrollIntoView: 'plank-1' })).toBe('plank-1');
  });

  test('an explicit id wins over the displaced plank', ({ expect }) => {
    expect(resolveScrollIntoView('displaced', { scrollIntoView: 'plank-1', attendDisplaced: true })).toBe('plank-1');
  });

  test('attendDisplaced falls back to the displaced plank with no explicit id', ({ expect }) => {
    expect(resolveScrollIntoView('displaced', { attendDisplaced: true })).toBe('displaced');
  });

  test('attendDisplaced with nothing displaced yields undefined', ({ expect }) => {
    expect(resolveScrollIntoView(undefined, { attendDisplaced: true })).toBeUndefined();
  });

  test('attendDisplaced false ignores the displaced plank', ({ expect }) => {
    expect(resolveScrollIntoView('displaced', { attendDisplaced: false })).toBeUndefined();
  });
});
