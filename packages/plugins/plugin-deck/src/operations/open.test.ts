//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { resolveOpenScrollTarget } from './open.ts';

describe('resolveOpenScrollTarget', () => {
  test('lands on the first newly opened plank', ({ expect }) => {
    expect(resolveOpenScrollTarget({ newlyOpen: ['b', 'c'], scrollIntoView: undefined })).toBe('b');
  });

  test('is undefined when nothing is newly opened', ({ expect }) => {
    expect(resolveOpenScrollTarget({ newlyOpen: [], scrollIntoView: undefined })).toBeUndefined();
  });

  test('a caller declining scrollIntoView gets nothing, even with a newly opened plank', ({ expect }) => {
    expect(resolveOpenScrollTarget({ newlyOpen: ['b'], scrollIntoView: false })).toBeUndefined();
  });

  test('scrollIntoView: true behaves like the default', ({ expect }) => {
    expect(resolveOpenScrollTarget({ newlyOpen: ['b'], scrollIntoView: true })).toBe('b');
  });
});
