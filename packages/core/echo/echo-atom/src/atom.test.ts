//
// Copyright 2025 DXOS.org
//

import * as Registry from '@effect-atom/atom/Registry';
import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { createObject } from '@dxos/echo-db';

import * as AtomObj from './atom';

describe('Echo Atom - Basic Functionality', () => {
  test('AtomObj.make creates atom for entire object', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    const atom = AtomObj.make(obj);

    // Returns a snapshot (plain object), not the Echo object itself.
    const snapshot = registry.get(atom);
    expect(snapshot).not.toBe(obj);
    expect(snapshot.name).toBe('Test');
    expect(snapshot.username).toBe('test');
    expect(snapshot.email).toBe('test@example.com');
  });

  test('AtomObj.makeProperty creates atom for specific property', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    const atom = AtomObj.makeProperty(obj, 'name');

    const atomValue = registry.get(atom);
    expect(atomValue).toBe('Test');
  });

  test('AtomObj.makeProperty is type-safe', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();
    // This should compile and work.
    const nameAtom = AtomObj.makeProperty(obj, 'name');
    const emailAtom = AtomObj.makeProperty(obj, 'email');

    expect(registry.get(nameAtom)).toBe('Test');
    expect(registry.get(emailAtom)).toBe('test@example.com');
  });

  test('atom updates when object is mutated via Obj.change', () => {
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

    // Mutate object via Obj.change.
    Obj.change(obj, (o) => {
      o.name = 'Updated';
    });

    // Subscription should have fired: immediate + update.
    expect(updateCount).toBe(2);

    // Atom should reflect the change.
    expect(registry.get(atom)).toBe('Updated');
    expect(obj.name).toBe('Updated');
  });

  test('property atom supports updater pattern via Obj.change', () => {
    const obj = createObject(
      Obj.make(TestSchema.Task, {
        title: 'Task',
      }),
    );

    const registry = Registry.make();
    const atom = AtomObj.makeProperty(obj, 'title');

    let updateCount = 0;
    registry.subscribe(
      atom,
      () => {
        updateCount++;
      },
      { immediate: true },
    );

    // Update through Obj.change.
    Obj.change(obj, (o) => {
      o.title = (o.title ?? '') + ' Updated';
    });

    // Subscription should have fired: immediate + update.
    expect(updateCount).toBe(2);

    // Atom should reflect the change.
    expect(registry.get(atom)).toBe('Task Updated');
    expect(obj.title).toBe('Task Updated');
  });

  test('atoms work for plain live objects (Obj.make without createObject)', () => {
    // This test explicitly verifies that reactivity works for plain live objects
    // created with just Obj.make() - no createObject() or database required.
    // This is the simplest form of reactive object.
    const obj = Obj.make(TestSchema.Person, { name: 'Standalone', username: 'test', email: 'test@example.com' });

    // Verify object has an id (Obj.make generates one).
    expect(obj.id).toBeDefined();

    const registry = Registry.make();
    const objectAtom = AtomObj.make(obj);
    const propertyAtom = AtomObj.makeProperty(obj, 'name');

    let objectUpdateCount = 0;
    let propertyUpdateCount = 0;

    registry.subscribe(objectAtom, () => objectUpdateCount++, { immediate: true });
    registry.subscribe(propertyAtom, () => propertyUpdateCount++, { immediate: true });

    expect(objectUpdateCount).toBe(1);
    expect(propertyUpdateCount).toBe(1);

    // Mutate the standalone object.
    obj.name = 'Updated Standalone';

    // Both atoms should have received updates.
    expect(objectUpdateCount).toBe(2);
    expect(propertyUpdateCount).toBe(2);

    // Verify values are correct.
    expect(registry.get(objectAtom)!.name).toBe('Updated Standalone');
    expect(registry.get(propertyAtom)).toBe('Updated Standalone');
  });
});
