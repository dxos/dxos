//
// Copyright 2026 DXOS.org
//

import { renderHook } from '@testing-library/react';
import { describe, test } from 'vitest';

import { useListGrid } from './useListGrid';

describe('useListGrid', () => {
  test('emits handle + title only by default', ({ expect }) => {
    const { result } = renderHook(() => useListGrid());
    expect(result.current.rowProps.style.gridTemplateColumns).toBe('var(--dx-rail-item) 1fr');
  });

  test('appends action slots between title and trailing', ({ expect }) => {
    const { result } = renderHook(() => useListGrid({ actionSlots: 2 }));
    expect(result.current.rowProps.style.gridTemplateColumns).toBe(
      'var(--dx-rail-item) 1fr var(--dx-rail-item) var(--dx-rail-item)',
    );
  });

  test('reserves expand and trailing slots when requested', ({ expect }) => {
    const { result } = renderHook(() => useListGrid({ expandable: true, trailing: true }));
    expect(result.current.rowProps.style.gridTemplateColumns).toBe(
      'var(--dx-rail-item) 1fr var(--dx-rail-item) var(--dx-rail-item)',
    );
  });

  test('combines actions, expand, and trailing in declared order', ({ expect }) => {
    const { result } = renderHook(() => useListGrid({ actionSlots: 1, expandable: true, trailing: true }));
    expect(result.current.rowProps.style.gridTemplateColumns).toBe(
      'var(--dx-rail-item) 1fr var(--dx-rail-item) var(--dx-rail-item) var(--dx-rail-item)',
    );
  });

  test('anchors columns to the row top so trailing does not shift on body growth', ({ expect }) => {
    const { result } = renderHook(() => useListGrid({ trailing: true }));
    expect(result.current.rowProps.className).toContain('items-start');
  });
});
