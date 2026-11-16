//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as AnchoredTo from './AnchoredTo.ts';

describe('AnchoredTo', () => {
  test('a path anchor round-trips keys, indexes, matches and a cursor range', ({ expect }) => {
    const anchor = { path: ['requirements', { key: 'k/1' }, 'text'], from: '2@a1', to: '7@a1' };
    const value = AnchoredTo.formatPathAnchor(anchor);
    expect(value).toBe('requirements/%7B%22key%22%3A%22k%2F1%22%7D/text/[2@a1-7@a1]');
    expect(AnchoredTo.parsePathAnchor(value)).toEqual(anchor);

    const escaped = { path: ['@odd', 3], from: '4@b2', to: '4@b2' };
    expect(AnchoredTo.formatPathAnchor(escaped)).toBe('%5C%40odd/@3/[4@b2]');
    expect(AnchoredTo.parsePathAnchor(AnchoredTo.formatPathAnchor(escaped))).toEqual(escaped);
  });

  test('a Markdown range is not a path anchor', ({ expect }) => {
    expect(AnchoredTo.parsePathAnchor('2@a1:7@a1')).toBeUndefined();
  });
});
