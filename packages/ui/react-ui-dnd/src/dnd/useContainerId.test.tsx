//
// Copyright 2026 DXOS.org
//

import { renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { useContainerId } from './useContainerId';

describe('useContainerId', () => {
  test('prefixes a stable per-instance discriminator', () => {
    const { result, rerender } = renderHook(() => useContainerId('column'));
    const first = result.current;
    expect(first).toMatch(/^column:/);
    rerender();
    expect(result.current).toBe(first); // stable across renders
  });

  test('two instances differ', () => {
    const a = renderHook(() => useContainerId('column')).result.current;
    const b = renderHook(() => useContainerId('column')).result.current;
    expect(a).not.toBe(b);
  });
});
