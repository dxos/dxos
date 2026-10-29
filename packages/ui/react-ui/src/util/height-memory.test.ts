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
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('a height recorded in one session is there in the next, stored without its key', async () => {
    createHeightMemory('test').set('echo://space/document', 420);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(createHeightMemory('test').get('echo://space/document')).toBe(420);
    expect(JSON.stringify({ ...localStorage })).not.toContain('document');
  });

  test('an element keeps its remembered height while its content arrives', async () => {
    const memory = createHeightMemory('test');
    memory.set('section', 300);
    const element = document.createElement('div');
    renderHook(() => useReservedHeight(memory, 'section', { current: element }));
    expect(element.style.minHeight).toBe('300px');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(element.style.minHeight).toBe('');
  });
});
