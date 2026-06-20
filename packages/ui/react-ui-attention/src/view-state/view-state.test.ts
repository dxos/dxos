//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { createDefaultBackends } from './backends';
import { ViewStateManager, defineViewState } from './view-state';

const Counter = defineViewState({
  key: 'counter',
  backend: 'memory',
  schema: Schema.Struct({ value: Schema.Number }).pipe(Schema.mutable),
  defaultValue: () => ({ value: 0 }),
});

describe('ViewStateManager', () => {
  const make = () => {
    const registry = Registry.make();
    return new ViewStateManager({ registry, backends: createDefaultBackends(registry) });
  };

  test('returns the aspect default for an unwritten context', ({ expect }) => {
    const manager = make();
    expect(manager.get(Counter, 'a')).toEqual({ value: 0 });
  });

  test('set then get round-trips per context', ({ expect }) => {
    const manager = make();
    manager.set(Counter, 'a', { value: 5 });
    expect(manager.get(Counter, 'a')).toEqual({ value: 5 });
    expect(manager.get(Counter, 'b')).toEqual({ value: 0 });
  });

  test('subscribe fires on change for that context', ({ expect }) => {
    const manager = make();
    let calls = 0;
    const dispose = manager.subscribe(Counter, 'a', () => {
      calls++;
    });
    manager.set(Counter, 'a', { value: 1 });
    expect(calls).toBeGreaterThan(0);
    dispose();
  });

  test('contexts enumerates touched contexts for an aspect', ({ expect }) => {
    const manager = make();
    manager.set(Counter, 'a', { value: 1 });
    manager.set(Counter, 'b', { value: 2 });
    expect(new Set(manager.contexts(Counter))).toEqual(new Set(['a', 'b']));
  });
});
