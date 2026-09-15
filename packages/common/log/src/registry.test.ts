//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createLogFileRegistry } from './registry.ts';

describe('LogFileRegistry', () => {
  test('registers unique files, returned sorted', ({ expect }) => {
    const registry = createLogFileRegistry();
    registry.register('b.ts');
    registry.register('a.ts');
    registry.register('b.ts');
    expect(registry.getFiles()).toEqual(['a.ts', 'b.ts']);
  });

  test('getFiles returns a copy (callers cannot mutate internal state)', ({ expect }) => {
    const registry = createLogFileRegistry();
    registry.register('a.ts');
    registry.getFiles().push('x.ts');
    expect(registry.getFiles()).toEqual(['a.ts']);
  });

  test('notifies subscribers only on a new file; unsubscribe stops notifications', ({ expect }) => {
    const registry = createLogFileRegistry();
    let count = 0;
    const unsubscribe = registry.subscribe(() => {
      count++;
    });
    registry.register('a.ts');
    registry.register('a.ts'); // duplicate — no notification
    expect(count).toBe(1);
    unsubscribe();
    registry.register('b.ts');
    expect(count).toBe(1);
  });

  test('clear empties the registry and notifies', ({ expect }) => {
    const registry = createLogFileRegistry();
    let count = 0;
    registry.subscribe(() => {
      count++;
    });
    registry.register('a.ts');
    registry.clear();
    expect(registry.getFiles()).toEqual([]);
    expect(count).toBe(2);
  });

  test('register ignores empty/non-string input', ({ expect }) => {
    const registry = createLogFileRegistry();
    registry.register('');
    expect(registry.getFiles()).toEqual([]);
  });
});
