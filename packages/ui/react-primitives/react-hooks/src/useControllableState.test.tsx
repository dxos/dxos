//
// Copyright 2026 DXOS.org
//

import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { useControllableState } from './useControllableState';

describe('useControllableState', () => {
  test('uncontrolled: seeds from defaultProp, stores, and reports each change', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ defaultProp: 1, onChange }));
    expect(result.current[0]).toBe(1);
    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);
    expect(onChange).toHaveBeenCalledWith(2);
    act(() => result.current[1]((prev) => (prev ?? 0) + 1));
    expect(result.current[0]).toBe(3);
    expect(onChange).toHaveBeenLastCalledWith(3);
  });

  test('controlled: reports but never stores', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(({ prop }) => useControllableState({ prop, onChange }), {
      initialProps: { prop: 'a' },
    });
    act(() => result.current[1]('b'));
    expect(result.current[0]).toBe('a');
    expect(onChange).toHaveBeenCalledWith('b');
    act(() => result.current[1]('a'));
    expect(onChange).toHaveBeenCalledTimes(1);
    rerender({ prop: 'b' });
    expect(result.current[0]).toBe('b');
  });
});
