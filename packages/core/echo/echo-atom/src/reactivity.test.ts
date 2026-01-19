//
// Copyright 2025 DXOS.org
//

import * as Registry from '@effect-atom/atom/Registry';
import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { createObject } from '@dxos/echo-db';

import { AtomObj } from './atom';

describe('Echo Atom - Reactivity', () => {
  test('atom updates when Echo object is mutated', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    const atom = AtomObj.make(obj);

    // Returns a snapshot (plain object), not the Echo object itself.
    const initialSnapshot = registry.get(atom);
    expect(initialSnapshot.name).toBe('Test');

    // Subscribe to enable reactivity.
    registry.subscribe(atom, () => {});

    // Update the object directly.
    obj.name = 'Updated';

    const updatedSnapshot = registry.get(atom);
    expect(updatedSnapshot.name).toBe('Updated');
  });

  test('property atom updates when its property is mutated', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    const atom = AtomObj.makeProperty(obj, 'name');

    expect(registry.get(atom)).toBe('Test');

    // Subscribe to enable reactivity.
    registry.subscribe(atom, () => {});

    // Update the property directly.
    obj.name = 'Updated';

    expect(registry.get(atom)).toBe('Updated');
  });

  test('property atom does NOT update when other properties change', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    const nameAtom = AtomObj.makeProperty(obj, 'name');
    const emailAtom = AtomObj.makeProperty(obj, 'email');

    const initialName = registry.get(nameAtom);
    const initialEmail = registry.get(emailAtom);
    expect(initialName).toBe('Test');
    expect(initialEmail).toBe('test@example.com');

    // Subscribe to enable reactivity.
    let nameUpdateCount = 0;
    let emailUpdateCount = 0;
    registry.subscribe(nameAtom, () => {
      nameUpdateCount++;
    });
    registry.subscribe(emailAtom, () => {
      emailUpdateCount++;
    });

    // Update only email property.
    obj.email = 'updated@example.com';

    // Name atom should NOT have changed.
    expect(registry.get(nameAtom)).toBe('Test');
    expect(nameUpdateCount).toBe(0);

    // Email atom should have changed.
    expect(registry.get(emailAtom)).toBe('updated@example.com');
    expect(emailUpdateCount).toBe(1);
  });

  test('multiple property updates on same object update respective atoms', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    const nameAtom = AtomObj.makeProperty(obj, 'name');
    const emailAtom = AtomObj.makeProperty(obj, 'email');

    // Subscribe to enable reactivity.
    registry.subscribe(nameAtom, () => {});
    registry.subscribe(emailAtom, () => {});

    // Update multiple properties directly.
    obj.name = 'Updated';
    obj.email = 'updated@example.com';

    expect(registry.get(nameAtom)).toBe('Updated');
    expect(registry.get(emailAtom)).toBe('updated@example.com');
  });

  test('direct object mutations flow through to atoms', () => {
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

    // Update object directly.
    obj.name = 'Updated';
    obj.email = 'updated@example.com';

    // Updates fire through Obj.subscribe.
    expect(updateCount).toBe(initialCount + 2);

    // Verify final state - returns snapshot (plain object).
    const finalSnapshot = registry.get(atom);
    expect(finalSnapshot.name).toBe('Updated');
    expect(finalSnapshot.email).toBe('updated@example.com');
  });
});
