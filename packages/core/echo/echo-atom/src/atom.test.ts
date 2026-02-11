//
// Copyright 2025 DXOS.org
//

import * as Registry from '@effect-atom/atom/Registry';
import { describe, expect, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
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
    Obj.change(obj, (o) => {
      o.name = 'Updated Standalone';
    });

    // Both atoms should have received updates.
    expect(objectUpdateCount).toBe(2);
    expect(propertyUpdateCount).toBe(2);

    // Verify values are correct.
    expect(registry.get(objectAtom)!.name).toBe('Updated Standalone');
    expect(registry.get(propertyAtom)).toBe('Updated Standalone');
  });
});

describe('Echo Atom - Referential Equality', () => {
  test('AtomObj.make returns same atom instance for same object', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const atom1 = AtomObj.make(obj);
    const atom2 = AtomObj.make(obj);

    // Same object should return the exact same atom instance.
    expect(atom1).toBe(atom2);
  });

  test('AtomObj.make returns different atom instances for different objects', () => {
    const obj1 = createObject(
      Obj.make(TestSchema.Person, { name: 'Test1', username: 'test1', email: 'test1@example.com' }),
    );
    const obj2 = createObject(
      Obj.make(TestSchema.Person, { name: 'Test2', username: 'test2', email: 'test2@example.com' }),
    );

    const atom1 = AtomObj.make(obj1);
    const atom2 = AtomObj.make(obj2);

    // Different objects should return different atom instances.
    expect(atom1).not.toBe(atom2);
  });

  test('AtomObj.makeProperty returns same atom instance for same object and key', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const atom1 = AtomObj.makeProperty(obj, 'name');
    const atom2 = AtomObj.makeProperty(obj, 'name');

    // Same object and key should return the exact same atom instance.
    expect(atom1).toBe(atom2);
  });

  test('AtomObj.makeProperty returns different atom instances for same object but different keys', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const nameAtom = AtomObj.makeProperty(obj, 'name');
    const emailAtom = AtomObj.makeProperty(obj, 'email');

    // Same object but different keys should return different atom instances.
    expect(nameAtom).not.toBe(emailAtom);
  });

  test('AtomObj.makeProperty returns different atom instances for different objects with same key', () => {
    const obj1 = createObject(
      Obj.make(TestSchema.Person, { name: 'Test1', username: 'test1', email: 'test1@example.com' }),
    );
    const obj2 = createObject(
      Obj.make(TestSchema.Person, { name: 'Test2', username: 'test2', email: 'test2@example.com' }),
    );

    const atom1 = AtomObj.makeProperty(obj1, 'name');
    const atom2 = AtomObj.makeProperty(obj2, 'name');

    // Different objects should return different atom instances even for same key.
    expect(atom1).not.toBe(atom2);
  });

  test('cached atoms remain reactive after multiple retrievals', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();

    // Get the same atom multiple times.
    const atom1 = AtomObj.make(obj);
    const atom2 = AtomObj.make(obj);
    const atom3 = AtomObj.make(obj);

    // All should be the same instance.
    expect(atom1).toBe(atom2);
    expect(atom2).toBe(atom3);

    // Subscribe to the atom.
    let updateCount = 0;
    registry.subscribe(atom1, () => updateCount++, { immediate: true });

    expect(updateCount).toBe(1);

    // Mutate the object.
    Obj.change(obj, (o) => {
      o.name = 'Updated';
    });

    // The subscription should still work.
    expect(updateCount).toBe(2);
    expect(registry.get(atom1).name).toBe('Updated');
  });

  test('cached property atoms remain reactive after multiple retrievals', () => {
    const obj = createObject(
      Obj.make(TestSchema.Person, { name: 'Test', username: 'test', email: 'test@example.com' }),
    );

    const registry = Registry.make();

    // Get the same property atom multiple times.
    const atom1 = AtomObj.makeProperty(obj, 'name');
    const atom2 = AtomObj.makeProperty(obj, 'name');
    const atom3 = AtomObj.makeProperty(obj, 'name');

    // All should be the same instance.
    expect(atom1).toBe(atom2);
    expect(atom2).toBe(atom3);

    // Subscribe to the atom.
    let updateCount = 0;
    registry.subscribe(atom1, () => updateCount++, { immediate: true });

    expect(updateCount).toBe(1);

    // Mutate the specific property.
    Obj.change(obj, (o) => {
      o.name = 'Updated';
    });

    // The subscription should still work.
    expect(updateCount).toBe(2);
    expect(registry.get(atom1)).toBe('Updated');
  });

  test('AtomObj.make returns same atom instance for different ref instances with same DXN', ({ expect }) => {
    const org = createObject(Obj.make(TestSchema.Organization, { name: 'DXOS' }));
    const person = createObject(
      Obj.make(TestSchema.Person, {
        name: 'Test',
        username: 'test',
        email: 'test@example.com',
        employer: Ref.make(org),
      }),
    );

    // Each property access returns a new Ref instance from the ECHO proxy.
    const ref1 = person.employer!;
    const ref2 = person.employer!;
    expect(ref1).not.toBe(ref2);

    // Despite being different Ref instances, they should resolve to the same atom.
    const atom1 = AtomObj.make(ref1);
    const atom2 = AtomObj.make(ref2);
    expect(atom1).toBe(atom2);
  });
});
