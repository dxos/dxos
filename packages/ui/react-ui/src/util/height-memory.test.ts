//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createHeightMemory, useReservedHeight } from './height-memory.ts';

describe('height memory', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test('an element keeps the height it last rendered at, at its width, while its content arrives', async () => {
    const memory = createHeightMemory();
    const element = document.createElement('div');
    const observed = observeResizes();

    // First visit: the content renders at 300 px, which is remembered for this width.
    const first = renderHook(() => useReservedHeight(memory, 'section', { current: element }));
    observed.resize(640, 300);
    first.unmount();

    // Next visit: it mounts short, before its content, and is held at 300 px until that arrives.
    renderHook(() => useReservedHeight(memory, 'section', { current: element }));
    observed.resize(640, 80);
    expect(element.style.minHeight).toBe('300px');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(element.style.minHeight).toBe('');
  });

  test('content taller than its reservation is remembered at once', async () => {
    const memory = createHeightMemory();
    const element = document.createElement('div');
    const observed = observeResizes();
    const first = renderHook(() => useReservedHeight(memory, 'section', { current: element }));
    observed.resize(640, 300);
    first.unmount();

    renderHook(() => useReservedHeight(memory, 'section', { current: element }));
    observed.resize(640, 80);
    observed.resize(640, 300);
    expect(memory.get('section@20')).toBe(300);
    observed.resize(640, 450);
    expect(memory.get('section@20')).toBe(450);
  });

  test('a width that settles while its content arrives finds the height remembered for it', async () => {
    const memory = createHeightMemory();
    const element = document.createElement('div');
    const observed = observeResizes();
    const narrow = renderHook(() => useReservedHeight(memory, 'section', { current: element }));
    observed.resize(640, 300);
    narrow.unmount();
    // Wider, it is shorter: recorded once the narrow height it held at mount is released.
    const wide = renderHook(() => useReservedHeight(memory, 'section', { current: element }));
    await vi.advanceTimersByTimeAsync(1_000);
    observed.resize(1200, 200);
    wide.unmount();

    // It mounts holding the latest height, then the width settles on the narrow column.
    renderHook(() => useReservedHeight(memory, 'section', { current: element }));
    expect(element.style.minHeight).toBe('200px');
    observed.resize(1200, 80);
    expect(element.style.minHeight).toBe('200px');
    observed.resize(640, 80);
    expect(element.style.minHeight).toBe('300px');
  });
});

type Box = { inlineSize: number; blockSize: number };

/** Replaces `ResizeObserver` with one the test drives, reporting a border box to the latest observer. */
const observeResizes = () => {
  let notify: ((entries: { borderBoxSize: Box[] }[]) => void) | undefined;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: (entries: { borderBoxSize: Box[] }[]) => void) {
        notify = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  return {
    resize: (inlineSize: number, blockSize: number) => notify?.([{ borderBoxSize: [{ inlineSize, blockSize }] }]),
  };
};
