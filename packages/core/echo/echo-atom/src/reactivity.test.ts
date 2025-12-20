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
  test('atom updates when Echo object is updated via AtomObj.update', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    const atom = AtomObj.make(obj);

    const initialValue = AtomObj.get(registry, atom);
    expect(initialValue.name).toBe('Test');

    // Subscribe to enable reactivity
    AtomObj.subscribe(registry, atom, () => {});

    // Update the object via explicit API
    AtomObj.update(registry, atom, (obj) => {
      obj.name = 'Updated';
    });

    const updatedValue = AtomObj.get(registry, atom);
    expect(updatedValue.name).toBe('Updated');
  });

  test('property atom updates when its property is updated via AtomObj.updateProperty', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    const atom = AtomObj.makeProperty(obj, 'name');

    expect(AtomObj.get(registry, atom)).toBe('Test');

    // Subscribe to enable reactivity
    AtomObj.subscribe(registry, atom, () => {});

    // Update the property via explicit API
    AtomObj.updateProperty(registry, atom, 'Updated');

    expect(AtomObj.get(registry, atom)).toBe('Updated');
  });

  test('property atom does NOT update when other properties change', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    const nameAtom = AtomObj.makeProperty(obj, 'name');
    const emailAtom = AtomObj.makeProperty(obj, 'email');

    const initialName = AtomObj.get(registry, nameAtom);
    const initialEmail = AtomObj.get(registry, emailAtom);
    expect(initialName).toBe('Test');
    expect(initialEmail).toBe('test@example.com');

    // Subscribe to enable reactivity
    AtomObj.subscribe(registry, nameAtom, () => {});
    AtomObj.subscribe(registry, emailAtom, () => {});

    // Update a different property via explicit API
    AtomObj.updateProperty(registry, emailAtom, 'updated@example.com');

    // Name atom should NOT have changed
    expect(AtomObj.get(registry, nameAtom)).toBe('Test');
    // Email atom should have changed
    expect(AtomObj.get(registry, emailAtom)).toBe('updated@example.com');
  });

  test('multiple property updates on same object update respective atoms', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    const nameAtom = AtomObj.makeProperty(obj, 'name');
    const emailAtom = AtomObj.makeProperty(obj, 'email');

    // Subscribe to enable reactivity
    AtomObj.subscribe(registry, nameAtom, () => {});
    AtomObj.subscribe(registry, emailAtom, () => {});

    // Update multiple properties via explicit API
    AtomObj.updateProperty(registry, nameAtom, 'Updated');
    AtomObj.updateProperty(registry, emailAtom, 'updated@example.com');

    expect(AtomObj.get(registry, nameAtom)).toBe('Updated');
    expect(AtomObj.get(registry, emailAtom)).toBe('updated@example.com');
  });

  // NOTE: Direct object updates are deprecated and only maintained for backwards compatibility.
  // In the future, if the implicit API is maintained, it should be built on top of the explicit API
  // to ensure that implicit updates can be disabled.
  test('direct object updates still work for backwards compatibility', async () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    const atom = AtomObj.make(obj);

    let updateCount = 0;
    AtomObj.subscribe(
      registry,
      atom,
      () => {
        updateCount++;
      },
      { immediate: true },
    );

    // Get initial count (immediate: true causes initial update)
    const initialCount = updateCount;
    expect(initialCount).toBe(1);

    // Update object directly (deprecated, but still works)
    obj.name = 'Updated';
    obj.email = 'updated@example.com';

    // Updates fire through ObjectCore subscriptions
    expect(updateCount).toBe(initialCount + 2);

    // Verify final state
    const finalValue = AtomObj.get(registry, atom);
    expect(finalValue.name).toBe('Updated');
    expect(finalValue.email).toBe('updated@example.com');
  });
});
