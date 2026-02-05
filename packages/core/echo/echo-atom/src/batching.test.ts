//
// Copyright 2025 DXOS.org
//

import * as Registry from '@effect-atom/atom/Registry';
import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { createObject } from '@dxos/echo-db';

import * as AtomObj from './atom';

describe('Echo Atom - Batch Updates', () => {
  test('multiple updates to same object atom in single Obj.change fire single update', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    const atom = AtomObj.make(obj);

    let updateCount = 0;
    registry.subscribe(
      atom,
      () => {
        updateCount++;
      },
      { immediate: true },
    );

    // Get initial count (immediate: true causes initial update).
    const initialCount = updateCount;
    expect(initialCount).toBe(1); // Verify immediate update fired.

    // Make multiple updates to the same object in a single Obj.change call.
    Obj.change(obj, (o) => {
      o.name = 'Updated1';
      o.email = 'updated@example.com';
      o.username = 'updated';
    });

    // Should have fired once for initial + once for the Obj.change (not once per property update).
    expect(updateCount).toBe(2);

    // Verify final state.
    const finalValue = registry.get(atom);
    expect(finalValue.name).toBe('Updated1');
    expect(finalValue.email).toBe('updated@example.com');
    expect(finalValue.username).toBe('updated');
  });

  test('multiple separate Obj.change calls fire separate updates', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    const atom = AtomObj.make(obj);

    let updateCount = 0;
    registry.subscribe(
      atom,
      () => {
        updateCount++;
      },
      { immediate: true },
    );

    // Get initial count (immediate: true causes initial update).
    const initialCount = updateCount;
    expect(initialCount).toBe(1);

    // Make multiple separate Obj.change calls.
    Obj.change(obj, (o) => {
      o.name = 'Updated1';
    });
    Obj.change(obj, (o) => {
      o.email = 'updated@example.com';
    });
    Obj.change(obj, (o) => {
      o.username = 'updated';
    });

    // Should have fired once for initial + once per Obj.change call.
    expect(updateCount).toBe(4);

    // Verify final state.
    const finalValue = registry.get(atom);
    expect(finalValue.name).toBe('Updated1');
    expect(finalValue.email).toBe('updated@example.com');
    expect(finalValue.username).toBe('updated');
  });

  test('multiple updates to same property atom in single Obj.change fire single update', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    const atom = AtomObj.makeProperty(obj, 'name');

    let updateCount = 0;
    registry.subscribe(
      atom,
      () => {
        updateCount++;
      },
      { immediate: true },
    );

    // Get initial count (immediate: true causes initial update).
    const initialCount = updateCount;
    expect(initialCount).toBe(1);

    // Make multiple updates to the same property in a single Obj.change call.
    Obj.change(obj, (o) => {
      o.name = 'Updated1';
      o.name = 'Updated2';
      o.name = 'Updated3';
    });

    // Should have fired once for initial + once for the Obj.change (not once per assignment).
    expect(updateCount).toBe(2);

    // Verify final state.
    expect(registry.get(atom)).toBe('Updated3');
  });
});
