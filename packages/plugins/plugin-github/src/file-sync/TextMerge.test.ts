//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as TextMerge from './TextMerge.ts';

describe('TextMerge.merge', () => {
  test('keeps both sides’ edits to different lines', ({ expect }) => {
    const base = ['one', 'two', 'three'].join('\n');
    const local = ['one, local', 'two', 'three'].join('\n');
    const next = ['one', 'two', 'three, remote'].join('\n');
    expect(TextMerge.merge({ base, local, next })).toBe(['one, local', 'two', 'three, remote'].join('\n'));
  });

  test('takes the other side whole when one side is unchanged', ({ expect }) => {
    expect(TextMerge.merge({ base: 'a', local: 'a', next: 'b' })).toBe('b');
    expect(TextMerge.merge({ base: 'a', local: 'b', next: 'a' })).toBe('b');
  });
});
