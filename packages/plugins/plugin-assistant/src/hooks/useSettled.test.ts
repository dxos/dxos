//
// Copyright 2026 DXOS.org
//

// @vitest-environment happy-dom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { useSettled } from './useSettled.ts';

type Item = { id: string };

describe('useSettled', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('shows an item only once it has been present for the delay', () => {
    const items: Item[] = [{ id: 'a' }];
    const { result } = renderHook(({ items }) => useSettled(items, 1_000), { initialProps: { items } });
    expect(result.current).toEqual([]);

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(result.current).toEqual([]);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toEqual([{ id: 'a' }]);
  });

  test('an item that leaves before the delay is never shown', () => {
    const { result, rerender } = renderHook(({ items }: { items: Item[] }) => useSettled(items, 1_000), {
      initialProps: { items: [{ id: 'a' }] },
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    rerender({ items: [] });
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current).toEqual([]);
  });

  test('a later arrival does not postpone an earlier one', () => {
    const first: Item = { id: 'a' };
    const second: Item = { id: 'b' };
    const { result, rerender } = renderHook(({ items }: { items: Item[] }) => useSettled(items, 1_000), {
      initialProps: { items: [first] },
    });
    act(() => {
      vi.advanceTimersByTime(800);
    });
    rerender({ items: [first, second] });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toEqual([first]);

    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(result.current).toEqual([first, second]);
  });
});
