//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { offsetMap } from './text.ts';

describe('offsetMap', () => {
  const source = 'Feeds drop entries\n    older than  their retention.';
  const value = 'Feeds drop entries older than their retention.';
  const map = offsetMap(value, source, 10);

  test('maps each character of the value to the same one in the source', ({ expect }) => {
    for (let i = 0; i < value.length; i++) {
      if (value[i] !== ' ') {
        expect(source[map.toSource(i) - 10]).toBe(value[i]);
      }
    }
    expect(map.toSource(value.length)).toBe(10 + source.length);
  });

  test('maps source offsets back, and none outside the source', ({ expect }) => {
    expect(map.fromSource(10 + source.indexOf('older'))).toBe(value.indexOf('older'));
    expect(map.fromSource(10 + source.length)).toBe(value.length);
    expect(map.fromSource(9)).toBeUndefined();
    expect(map.fromSource(11 + source.length)).toBeUndefined();
  });
});
