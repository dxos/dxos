//
// Copyright 2026 DXOS.org
//

import { renderHook } from '@testing-library/react';
import { describe, test } from 'vitest';

import { useListNavigation } from './useListNavigation';

describe('useListNavigation', () => {
  test('list mode emits role=list / listitem with vertical orientation', ({ expect }) => {
    const { result } = renderHook(() => useListNavigation({ mode: 'list' }));
    expect(result.current.containerProps.role).toBe('list');
    expect(result.current.containerProps['aria-orientation']).toBe('vertical');
    expect(result.current.itemProps().role).toBe('listitem');
    expect(result.current.itemProps().tabIndex).toBe(-1);
  });

  test('listbox mode emits role=listbox / option with focusable items', ({ expect }) => {
    const { result } = renderHook(() => useListNavigation({ mode: 'listbox' }));
    expect(result.current.containerProps.role).toBe('listbox');
    expect(result.current.itemProps().role).toBe('option');
    expect(result.current.itemProps().tabIndex).toBe(0);
  });

  test('grid mode emits role=grid / row and omits aria-orientation', ({ expect }) => {
    const { result } = renderHook(() => useListNavigation({ mode: 'grid' }));
    expect(result.current.containerProps.role).toBe('grid');
    expect(result.current.containerProps['aria-orientation']).toBeUndefined();
    expect(result.current.itemProps().role).toBe('row');
  });

  test('disabled item carries aria-disabled', ({ expect }) => {
    const { result } = renderHook(() => useListNavigation({ mode: 'listbox' }));
    expect(result.current.itemProps({ disabled: true })['aria-disabled']).toBe(true);
    expect(result.current.itemProps()['aria-disabled']).toBeUndefined();
  });

  test('emits Tabster data attributes on the container', ({ expect }) => {
    const { result } = renderHook(() => useListNavigation({ mode: 'listbox' }));
    const tabsterKeys = Object.keys(result.current.containerProps).filter((key) => key.startsWith('data-tabster'));
    expect(tabsterKeys.length).toBeGreaterThan(0);
  });
});
