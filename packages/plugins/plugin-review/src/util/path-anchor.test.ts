//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { AnchoredTo } from '@dxos/types';

import { isOrphaned } from './path-anchor.ts';

describe('path-anchor', () => {
  const pathAnchor = AnchoredTo.formatPathAnchor({ path: ['requirements', { key: 'k' }, 'text'], from: 'a', to: 'b' });

  test('a path anchor whose field no longer resolves is orphaned, whoever removed the field', ({ expect }) => {
    expect(isOrphaned(pathAnchor, () => undefined)).toBe(true);
    expect(isOrphaned(pathAnchor, () => 'quoted')).toBe(false);
    expect(isOrphaned(pathAnchor, () => '')).toBe(false);
  });

  test('a whole-object thread, or an anchor that is not a path, is never orphaned', ({ expect }) => {
    expect(isOrphaned(undefined, () => undefined)).toBe(false);
    expect(isOrphaned('1234:5678', () => undefined)).toBe(false);
    expect(isOrphaned(pathAnchor, undefined)).toBe(false);
  });
});
