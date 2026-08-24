//
// Copyright 2026 DXOS.org
//

import { act, renderHook } from '@testing-library/react';
import { describe, test, vi } from 'vitest';

import { useListDisclosure } from './useListDisclosure';

describe('useListDisclosure', () => {
  describe('single mode', () => {
    test('expanding an item sets it as the value', ({ expect }) => {
      const onValueChange = vi.fn();
      const { result } = renderHook(() => useListDisclosure({ mode: 'single', onValueChange }));
      expect(result.current.bind('a').expanded).toBe(false);
      act(() => result.current.bind('a').toggle());
      expect(onValueChange).toHaveBeenLastCalledWith('a');
    });

    test('expanding a second item collapses the first', ({ expect }) => {
      const { result, rerender } = renderHook(({ value }) => useListDisclosure({ mode: 'single', value }), {
        initialProps: { value: 'a' as string | undefined },
      });
      expect(result.current.bind('a').expanded).toBe(true);
      expect(result.current.bind('b').expanded).toBe(false);
      rerender({ value: 'b' });
      expect(result.current.bind('a').expanded).toBe(false);
      expect(result.current.bind('b').expanded).toBe(true);
    });

    test('toggling an expanded item collapses it to undefined', ({ expect }) => {
      const onValueChange = vi.fn();
      const { result } = renderHook(() => useListDisclosure({ mode: 'single', defaultValue: 'a', onValueChange }));
      expect(result.current.bind('a').expanded).toBe(true);
      act(() => result.current.bind('a').toggle());
      expect(onValueChange).toHaveBeenLastCalledWith(undefined);
    });
  });

  describe('multi mode', () => {
    test('expanding multiple items keeps all open', ({ expect }) => {
      const onValueChange = vi.fn();
      const { result } = renderHook(() => useListDisclosure({ mode: 'multi', onValueChange }));
      act(() => result.current.bind('a').toggle());
      act(() => result.current.bind('b').toggle());
      const lastCallSet = onValueChange.mock.lastCall?.[0] as Set<string>;
      expect(lastCallSet.has('a')).toBe(true);
      expect(lastCallSet.has('b')).toBe(true);
    });

    test('toggling a multi-expanded item removes it from the set', ({ expect }) => {
      const onValueChange = vi.fn();
      const { result } = renderHook(() =>
        useListDisclosure({ mode: 'multi', defaultValue: new Set(['a', 'b']), onValueChange }),
      );
      act(() => result.current.bind('a').toggle());
      const lastCallSet = onValueChange.mock.lastCall?.[0] as Set<string>;
      expect(lastCallSet.has('a')).toBe(false);
      expect(lastCallSet.has('b')).toBe(true);
    });
  });

  test('emits a stable trigger/panel id pair per item', ({ expect }) => {
    const { result } = renderHook(() => useListDisclosure({ mode: 'single' }));
    const first = result.current.bind('x');
    const second = result.current.bind('x');
    expect(first.triggerId).toBe(second.triggerId);
    expect(first.panelId).toBe(second.panelId);
    expect(first.triggerProps['aria-controls']).toBe(first.panelId);
    expect(first.panelProps['aria-labelledby']).toBe(first.triggerId);
  });
});
