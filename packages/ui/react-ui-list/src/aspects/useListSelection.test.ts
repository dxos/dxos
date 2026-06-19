//
// Copyright 2026 DXOS.org
//

import { act, renderHook } from '@testing-library/react';
import { describe, test, vi } from 'vitest';

import { useListSelection } from './useListSelection';

describe('useListSelection', () => {
  describe('single mode', () => {
    test('click selects the row', ({ expect }) => {
      const onValueChange = vi.fn();
      const { result } = renderHook(() => useListSelection({ mode: 'single', onValueChange }));
      act(() => result.current.bind('a').rowProps.onClick({} as any));
      expect(onValueChange).toHaveBeenLastCalledWith('a');
    });

    test('focus selects the row when selection-follows-focus is enabled (default)', ({ expect }) => {
      const onValueChange = vi.fn();
      const { result } = renderHook(() => useListSelection({ mode: 'single', onValueChange }));
      act(() => result.current.bind('a').rowProps.onFocus?.({} as any));
      expect(onValueChange).toHaveBeenLastCalledWith('a');
    });

    test('focus entering the list from outside does not change selection', ({ expect }) => {
      const onValueChange = vi.fn();
      // A listbox with one option, and an unrelated element outside it.
      const container = document.createElement('div');
      container.setAttribute('role', 'listbox');
      const optionA = document.createElement('div');
      const outside = document.createElement('div');
      container.append(optionA);
      document.body.append(container, outside);

      const { result } = renderHook(() => useListSelection({ mode: 'single', value: 'b', onValueChange }));

      // Entry focus (e.g. a popover auto-focusing on open): relatedTarget is outside the list.
      act(() => result.current.bind('a').rowProps.onFocus?.({ currentTarget: optionA, relatedTarget: outside } as any));
      expect(onValueChange).not.toHaveBeenCalled();

      // Navigation within the list: relatedTarget is inside the list, so selection follows focus.
      act(() =>
        result.current.bind('a').rowProps.onFocus?.({ currentTarget: optionA, relatedTarget: container } as any),
      );
      expect(onValueChange).toHaveBeenLastCalledWith('a');

      container.remove();
      outside.remove();
    });

    test('disabled rows do not update selection on click', ({ expect }) => {
      const onValueChange = vi.fn();
      const { result } = renderHook(() => useListSelection({ mode: 'single', onValueChange }));
      act(() => result.current.bind('a', { disabled: true }).rowProps.onClick({} as any));
      expect(onValueChange).not.toHaveBeenCalled();
    });

    test('aria-selected mirrors controlled value', ({ expect }) => {
      const { result, rerender } = renderHook(({ value }) => useListSelection({ mode: 'single', value }), {
        initialProps: { value: 'a' as string | undefined },
      });
      expect(result.current.bind('a').rowProps['aria-selected']).toBe(true);
      expect(result.current.bind('b').rowProps['aria-selected']).toBe(false);
      rerender({ value: 'b' });
      expect(result.current.bind('a').rowProps['aria-selected']).toBe(false);
      expect(result.current.bind('b').rowProps['aria-selected']).toBe(true);
    });
  });

  describe('multi mode', () => {
    test('click toggles row in/out of selection set', ({ expect }) => {
      const onValueChange = vi.fn();
      const { result } = renderHook(() => useListSelection({ mode: 'multi', onValueChange }));
      act(() => result.current.bind('a').rowProps.onClick({} as any));
      const firstCall = onValueChange.mock.calls[0]?.[0] as Set<string>;
      expect(firstCall.has('a')).toBe(true);
    });

    test('does not follow focus by default', ({ expect }) => {
      const { result } = renderHook(() => useListSelection({ mode: 'multi' }));
      expect(result.current.bind('a').rowProps.onFocus).toBeUndefined();
    });

    test('follows focus when explicitly enabled', ({ expect }) => {
      const onValueChange = vi.fn();
      const { result } = renderHook(() => useListSelection({ mode: 'multi', followsFocus: true, onValueChange }));
      act(() => result.current.bind('a').rowProps.onFocus?.({} as any));
      expect(onValueChange).toHaveBeenCalled();
    });
  });
});
