//
// Copyright 2025 DXOS.org
//

import * as Registry from '@effect-atom/atom/Registry';
import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { createObject } from '@dxos/echo-db';

import * as AtomObj from './atom';

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

    // Update the object via Obj.change.
    Obj.change(obj, (o) => {
      o.name = 'Updated';
    });

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

    // Update the property via Obj.change.
    Obj.change(obj, (o) => {
      o.name = 'Updated';
    });

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

    // Update only email property via Obj.change.
    Obj.change(obj, (o) => {
      o.email = 'updated@example.com';
    });

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

    // Update multiple properties via Obj.change.
    Obj.change(obj, (o) => {
      o.name = 'Updated';
      o.email = 'updated@example.com';
    });

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

    // Update object via Obj.change.
    Obj.change(obj, (o) => {
      o.name = 'Updated';
    });
    Obj.change(obj, (o) => {
      o.email = 'updated@example.com';
    });

    // Updates fire through Obj.subscribe (one per Obj.change call).
    expect(updateCount).toBe(initialCount + 2);

    // Verify final state - returns snapshot (plain object).
    const finalSnapshot = registry.get(atom);
    expect(finalSnapshot.name).toBe('Updated');
    expect(finalSnapshot.email).toBe('updated@example.com');
  });

  test('property mutation on standalone Obj.make object is synchronous', () => {
    // Test objects created with just Obj.make() - no createObject/database.
    const obj = Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' });

    const actions: string[] = [];
    const unsubscribe = Obj.subscribe(obj, () => {
      actions.push('update');
    });

    actions.push('before');
    Obj.change(obj, (o) => {
      o.name = 'Updated';
    });
    actions.push('after');

    // Updates must be synchronous: before -> update -> after.
    expect(actions).toEqual(['before', 'update', 'after']);

    // Verify the property was modified.
    expect(obj.name).toBe('Updated');

    unsubscribe();
  });

  test('array splice on standalone Obj.make object is synchronous', () => {
    // Test objects created with just Obj.make() - no createObject/database.
    const obj = Obj.make(TestSchema.Example, { stringArray: ['a', 'b', 'c', 'd'] });

    const actions: string[] = [];
    const unsubscribe = Obj.subscribe(obj, () => {
      actions.push('update');
    });

    actions.push('before');
    Obj.change(obj, (o) => {
      o.stringArray!.splice(1, 1);
    });
    actions.push('after');

    // Updates must be synchronous: before -> update -> after.
    expect(actions).toEqual(['before', 'update', 'after']);

    // Verify the array was modified.
    expect(obj.stringArray).toEqual(['a', 'c', 'd']);

    unsubscribe();
  });
});
