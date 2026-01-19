//
// Copyright 2025 DXOS.org
//

import * as Registry from '@effect-atom/atom/Registry';
import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { createObject } from '@dxos/echo-db';

import { AtomObj } from './atom';

describe('Echo Atom - Update Behavior', () => {
  test('multiple updates to same object atom fire individual updates', () => {
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

    // Make multiple updates to the object.
    obj.name = 'Updated1';
    obj.email = 'updated@example.com';
    obj.username = 'updated';

    // Each direct mutation fires an update.
    expect(updateCount).toBe(4); // 1 initial + 3 updates.

    // Verify final state.
    const finalValue = registry.get(atom);
    expect(finalValue.value.name).toBe('Updated1');
    expect(finalValue.value.email).toBe('updated@example.com');
    expect(finalValue.value.username).toBe('updated');
  });

  test('multiple updates to same property only fires when value changes', () => {
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

    // Make multiple updates to the same property.
    obj.name = 'Updated1';
    obj.name = 'Updated2';
    obj.name = 'Updated3';

    // Property atom only fires when value actually changes.
    expect(updateCount).toBe(4); // 1 initial + 3 value changes.

    // Verify final state.
    expect(registry.get(atom).value).toBe('Updated3');
  });

  test('property atom does not fire when setting same value', () => {
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

    expect(updateCount).toBe(1);

    // Set same value.
    obj.name = 'Test';

    // Should not fire update since value didn't change.
    expect(updateCount).toBe(1);

    // Now change to different value.
    obj.name = 'Different';
    expect(updateCount).toBe(2);
  });
});
