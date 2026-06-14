//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { resolveSelection, selectionSlice, toggleSelection } from './selection';

describe('selection helpers', () => {
  test('selectionSlice declares a memory-backed slice', ({ expect }) => {
    expect(selectionSlice.key).toEqual('selection');
    expect(selectionSlice.backend).toEqual('memory');
    expect(selectionSlice.defaultValue()).toEqual({ mode: 'multi', ids: [] });
  });

  test('resolveSelection extracts the value for the requested mode', ({ expect }) => {
    expect(resolveSelection({ mode: 'single', id: 'x' }, 'single')).toEqual('x');
    expect(resolveSelection({ mode: 'multi', ids: ['a', 'b'] }, 'multi')).toEqual(['a', 'b']);
    expect(resolveSelection({ mode: 'range', from: 'a', to: 'b' }, 'range')).toEqual({ from: 'a', to: 'b' });
    expect(resolveSelection({ mode: 'multi-range', ranges: [{ from: 'a', to: 'b' }] }, 'multi-range')).toEqual([
      { from: 'a', to: 'b' },
    ]);
  });

  test('resolveSelection returns the requested-mode default on mismatch or undefined', ({ expect }) => {
    expect(resolveSelection(undefined, 'single')).toBeUndefined();
    expect(resolveSelection(undefined, 'multi')).toEqual([]);
    // Stored value is the default multi but a single reader asks — yields the single default.
    expect(resolveSelection({ mode: 'multi', ids: [] }, 'single')).toBeUndefined();
    expect(resolveSelection({ mode: 'range' }, 'range')).toBeUndefined();
  });

  test('toggleSelection adds/removes within a multi selection', ({ expect }) => {
    expect(toggleSelection({ mode: 'multi', ids: ['a'] }, 'b')).toEqual({ mode: 'multi', ids: ['a', 'b'] });
    expect(toggleSelection({ mode: 'multi', ids: ['a', 'b'] }, 'b')).toEqual({ mode: 'multi', ids: ['a'] });
    // Tolerate a non-multi current value by starting fresh.
    expect(toggleSelection({ mode: 'single', id: 'x' }, 'b')).toEqual({ mode: 'multi', ids: ['b'] });
  });
});
