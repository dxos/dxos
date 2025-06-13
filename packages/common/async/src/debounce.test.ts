//
// Copyright 2020 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { debounce } from './debounce';
import { sleep } from './timeout';

describe('debounce', () => {
  test('debounces function calls', async () => {
    let count = 0;
    const fn = debounce(() => count++, 100);

    // First call should not execute immediately
    fn();
    expect(count).toBe(0);

    // Second call should reset the timer
    fn();
    expect(count).toBe(0);

    // Wait for debounce window to pass
    await sleep(150);
    expect(count).toBe(1); // Only the last call should execute
  });

  test('passes arguments to debounced function', async () => {
    let lastArgs: any[] = [];
    const fn = debounce((...args: any[]) => {
      lastArgs = args;
    }, 100);

    fn('test', 123);
    expect(lastArgs).toEqual([]); // Should not execute immediately

    // Call with different args
    fn('different', 456);
    expect(lastArgs).toEqual([]); // Should not execute immediately

    await sleep(150);
    expect(lastArgs).toEqual(['different', 456]); // Should execute with last args
  });

  test('handles multiple rapid calls', async () => {
    let count = 0;
    const fn = debounce(() => count++, 100);

    // Make multiple rapid calls
    for (let i = 0; i < 5; i++) {
      fn();
    }
    expect(count).toBe(0); // Should not execute immediately

    await sleep(150);
    expect(count).toBe(1); // Should execute only once after wait
  });
});
