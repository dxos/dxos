//
// Copyright 2026 DXOS.org
//

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { useCardHover } from './Row';

/**
 * The regression this guards: `useCardHover`'s cleanup depends on `open` and `enabled`, not just on
 * the stable `cancel`. Depending on `cancel` alone let a timer armed for the PREVIOUS contact fire the
 * stale `open` after the row was recycled onto another actor — a virtualized list reuses rows, so this
 * is the common case rather than an edge one.
 */
describe('useCardHover', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test('opens after the delay elapses', () => {
    const open = vi.fn();
    const { result } = renderHook(() => useCardHover(open, true));

    result.current.start();
    expect(open).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(open).toHaveBeenCalledTimes(1);
  });

  test('does nothing when disabled', () => {
    const open = vi.fn();
    const { result } = renderHook(() => useCardHover(open, false));

    result.current.start();
    vi.runAllTimers();
    expect(open).not.toHaveBeenCalled();
  });

  test('cancel disarms a pending timer', () => {
    const open = vi.fn();
    const { result } = renderHook(() => useCardHover(open, true));

    result.current.start();
    result.current.cancel();
    vi.runAllTimers();
    expect(open).not.toHaveBeenCalled();
  });

  test('a timer armed for the previous target never fires after the target changes', () => {
    // The actual regression: arm on one contact, re-point the row at another before the delay
    // elapses, and the first contact's card must not open.
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ open }) => useCardHover(open, true), {
      initialProps: { open: first },
    });

    result.current.start();
    rerender({ open: second });
    vi.runAllTimers();

    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
  });

  test('a timer armed while enabled never fires after the row is disabled', () => {
    const open = vi.fn();
    const { result, rerender } = renderHook(({ enabled }) => useCardHover(open, enabled), {
      initialProps: { enabled: true },
    });

    result.current.start();
    rerender({ enabled: false });
    vi.runAllTimers();

    expect(open).not.toHaveBeenCalled();
  });

  test('unmounting disarms a pending timer', () => {
    const open = vi.fn();
    const { result, unmount } = renderHook(() => useCardHover(open, true));

    result.current.start();
    unmount();
    vi.runAllTimers();

    expect(open).not.toHaveBeenCalled();
  });

  test('starting twice keeps only the later timer', () => {
    const open = vi.fn();
    const { result } = renderHook(() => useCardHover(open, true));

    result.current.start();
    result.current.start();
    vi.runAllTimers();

    expect(open).toHaveBeenCalledTimes(1);
  });
});
