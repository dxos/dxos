//
// Copyright 2026 DXOS.org
//

import { describe, expectTypeOf, test } from 'vitest';

import * as Entity from './Entity';
import { SnapshotKindId } from './internal';
import * as Obj from './Obj';
import * as Ref from './Ref';
import { TestSchema } from './testing';

describe('Obj', () => {
  describe('getSnapshot', () => {
    test('getSnapshot returns an immutable snapshot with SnapshotKindId', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });
      const snapshot = Obj.getSnapshot(obj);

      // Snapshot has SnapshotKindId, not KindId.
      expect(snapshot[SnapshotKindId]).toBe(Entity.Kind.Object);
      expect((snapshot as any)[Entity.KindId]).toBeUndefined();

      // Snapshot has same id and properties.
      expect(snapshot.id).toBe(obj.id);
      expect(snapshot.name).toBe('Test');
    });

    test('snapshot is frozen', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });
      const snapshot = Obj.getSnapshot(obj);

      expect(Object.isFrozen(snapshot)).toBe(true);
    });

    test('read-only helpers work with both reactive and snapshot', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });
      const snapshot = Obj.getSnapshot(obj);

      // getDXN - works with both.
      expect(Obj.getDXN(obj)).toBeDefined();
      expect(Obj.getDXN(snapshot)).toBeDefined();

      // getTypename - works with both.
      expect(Obj.getTypename(obj)).toBe('example.com/type/Person');
      expect(Obj.getTypename(snapshot)).toBe('example.com/type/Person');

      // getMeta - works with both.
      expect(Obj.getMeta(obj)).toBeDefined();
      expect(Obj.getMeta(snapshot)).toBeDefined();

      // getKeys - works with both.
      expect(Obj.getKeys(obj, 'test')).toEqual([]);
      expect(Obj.getKeys(snapshot, 'test')).toEqual([]);

      // isDeleted - works with both.
      expect(Obj.isDeleted(obj)).toBe(false);
      expect(Obj.isDeleted(snapshot)).toBe(false);

      // version - works with both.
      expect(Obj.version(obj)).toBeDefined();
      expect(Obj.version(snapshot)).toBeDefined();

      // toJSON - works with both.
      expect(Obj.toJSON(obj)).toBeDefined();
      expect(Obj.toJSON(snapshot)).toBeDefined();
    });

    test('reactive object has KindId, snapshot has SnapshotKindId', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });
      const snapshot = Obj.getSnapshot(obj);

      // Verify at runtime that the brands are different.
      expect(Entity.KindId in obj).toBe(true);
      expect(SnapshotKindId in obj).toBe(false);
      expect(SnapshotKindId in snapshot).toBe(true);
      expect(Entity.KindId in snapshot).toBe(false);
    });
  });

  describe('clone', () => {
    test('clones object with same properties', ({ expect }) => {
      const original = Obj.make(TestSchema.Person, {
        name: 'Alice',
        email: 'alice@example.com',
        username: 'alice',
        age: 30,
      });

      const cloned = Obj.clone(original);

      expect(cloned).not.toBe(original);
      expect(cloned.id).not.toBe(original.id);
      expect(cloned.name).toBe(original.name);
      expect(cloned.email).toBe(original.email);
      expect(cloned.username).toBe(original.username);
      expect(cloned.age).toBe(original.age);
    });

    test('cloned object is independent', ({ expect }) => {
      const original = Obj.make(TestSchema.Person, {
        name: 'Alice',
        email: 'alice@example.com',
        username: 'alice',
      });

      const cloned = Obj.clone(original);

      Obj.change(original, (p) => {
        p.name = 'Bob';
      });

      expect(original.name).toBe('Bob');
      expect(cloned.name).toBe('Alice');
    });

    test('clone with retainId option keeps original id', ({ expect }) => {
      const original = Obj.make(TestSchema.Person, {
        name: 'Alice',
        email: 'alice@example.com',
        username: 'alice',
      });

      const cloned = Obj.clone(original, { retainId: true });

      expect(cloned.id).toBe(original.id);
      expect(cloned.name).toBe(original.name);
    });

    test('shallow clone does not clone referenced objects', ({ expect }) => {
      const employer = Obj.make(TestSchema.Organization, {
        name: 'DXOS',
      });

      const person = Obj.make(TestSchema.Person, {
        name: 'Alice',
        email: 'alice@example.com',
        username: 'alice',
        employer: Ref.make(employer),
      });

      const cloned = Obj.clone(person);

      expect(cloned.employer).toBe(person.employer);
      expect(cloned.employer?.target).toBe(employer);
      expect(cloned.employer?.target).toBe(person.employer?.target);

      // Modifying the referenced object affects both
      Obj.change(employer, (org) => {
        org.name = 'Updated DXOS';
      });

      expect(cloned.employer?.target?.name).toBe('Updated DXOS');
      expect(person.employer?.target?.name).toBe('Updated DXOS');
    });

    test('deep clone recursively clones referenced objects', ({ expect }) => {
      const employer = Obj.make(TestSchema.Organization, {
        name: 'DXOS',
      });

      const person = Obj.make(TestSchema.Person, {
        name: 'Alice',
        email: 'alice@example.com',
        username: 'alice',
        employer: Ref.make(employer),
      });

      const cloned = Obj.clone(person, { deep: true });

      expect(cloned.employer).not.toBe(person.employer);
      expect(cloned.employer?.target).not.toBe(employer);
      expect(cloned.employer?.target?.id).not.toBe(employer.id);
      expect(cloned.employer?.target?.name).toBe(employer.name);

      // Modifying the original referenced object does not affect the clone
      Obj.change(employer, (org) => {
        org.name = 'Updated DXOS';
      });

      expect(cloned.employer?.target?.name).toBe('DXOS');
      expect(person.employer?.target?.name).toBe('Updated DXOS');
    });

    test('deep clone with nested references', ({ expect }) => {
      const task1 = Obj.make(TestSchema.Task, {
        title: 'Task 1',
        description: 'First task',
      });

      const task2 = Obj.make(TestSchema.Task, {
        title: 'Task 2',
        description: 'Second task',
        previous: Ref.make(task1),
      });

      const person = Obj.make(TestSchema.Person, {
        name: 'Alice',
        email: 'alice@example.com',
        username: 'alice',
        tasks: [Ref.make(task1), Ref.make(task2)],
      });

      const cloned = Obj.clone(person, { deep: true });

      expect(cloned.tasks).not.toBe(person.tasks);
      expect(cloned.tasks?.length).toBe(2);
      expect(cloned.tasks?.[0]?.target).not.toBe(task1);
      expect(cloned.tasks?.[0]?.target?.id).not.toBe(task1.id);
      expect(cloned.tasks?.[0]?.target?.title).toBe(task1.title);

      expect(cloned.tasks?.[1]?.target).not.toBe(task2);
      expect(cloned.tasks?.[1]?.target?.id).not.toBe(task2.id);
      expect(cloned.tasks?.[1]?.target?.title).toBe(task2.title);

      // Deep clone should also clone nested references
      expect(cloned.tasks?.[1]?.target?.previous?.target).not.toBe(task1);
      expect(cloned.tasks?.[1]?.target?.previous?.target?.id).not.toBe(task1.id);
      expect(cloned.tasks?.[1]?.target?.previous?.target?.title).toBe(task1.title);
    });

    test('deep clone with optional reference', ({ expect }) => {
      const employer = Obj.make(TestSchema.Organization, {
        name: 'DXOS',
      });

      const person = Obj.make(TestSchema.Person, {
        name: 'Alice',
        email: 'alice@example.com',
        username: 'alice',
        employer: Ref.make(employer),
      });

      const cloned = Obj.clone(person, { deep: true });

      expect(cloned.employer).toBeDefined();
      expect(cloned.employer?.target).toBeDefined();
      expect(cloned.employer?.target?.name).toBe('DXOS');

      // Test with undefined optional reference
      const personWithoutEmployer = Obj.make(TestSchema.Person, {
        name: 'Bob',
        email: 'bob@example.com',
        username: 'bob',
      });

      const clonedWithoutEmployer = Obj.clone(personWithoutEmployer, { deep: true });
      expect(clonedWithoutEmployer.employer).toBeUndefined();
    });

    test('deep clone preserves nested object properties', ({ expect }) => {
      const person = Obj.make(TestSchema.Person, {
        name: 'Alice',
        email: 'alice@example.com',
        username: 'alice',
        address: {
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
          coordinates: {
            lat: 37.7749,
            lng: -122.4194,
          },
        },
      });

      const cloned = Obj.clone(person, { deep: true });

      expect(cloned.address?.city).toBe('San Francisco');
      expect(cloned.address?.state).toBe('CA');
      expect(cloned.address?.zip).toBe('94102');
      expect(cloned.address?.coordinates.lat).toBe(37.7749);
      expect(cloned.address?.coordinates.lng).toBe(-122.4194);

      // Modifying nested properties should be independent
      Obj.change(person, (p) => {
        p.address!.city = 'New York';
      });

      expect(cloned.address?.city).toBe('San Francisco');
      expect(person.address?.city).toBe('New York');
    });

    test('deep clone with array of references', ({ expect }) => {
      const task1 = Obj.make(TestSchema.Task, { title: 'Task 1' });
      const task2 = Obj.make(TestSchema.Task, { title: 'Task 2' });
      const task3 = Obj.make(TestSchema.Task, { title: 'Task 3' });

      const person = Obj.make(TestSchema.Person, {
        name: 'Alice',
        email: 'alice@example.com',
        username: 'alice',
        tasks: [Ref.make(task1), Ref.make(task2), Ref.make(task3)],
      });

      const cloned = Obj.clone(person, { deep: true });

      expect(cloned.tasks?.length).toBe(3);
      expect(cloned.tasks?.[0]?.target?.title).toBe('Task 1');
      expect(cloned.tasks?.[1]?.target?.title).toBe('Task 2');
      expect(cloned.tasks?.[2]?.target?.title).toBe('Task 3');

      // All referenced tasks should be cloned
      expect(cloned.tasks?.[0]?.target).not.toBe(task1);
      expect(cloned.tasks?.[1]?.target).not.toBe(task2);
      expect(cloned.tasks?.[2]?.target).not.toBe(task3);

      // Modifying original tasks should not affect cloned ones
      Obj.change(task1, (t) => {
        t.title = 'Updated Task 1';
      });

      expect(cloned.tasks?.[0]?.target?.title).toBe('Task 1');
      expect(person.tasks?.[0]?.target?.title).toBe('Updated Task 1');
    });

    test('deep clone with retainId option', ({ expect }) => {
      const employer = Obj.make(TestSchema.Organization, {
        name: 'DXOS',
      });

      const person = Obj.make(TestSchema.Person, {
        name: 'Alice',
        email: 'alice@example.com',
        username: 'alice',
        employer: Ref.make(employer),
      });

      const cloned = Obj.clone(person, { deep: true, retainId: true });

      expect(cloned.id).toBe(person.id);
      expect(cloned.employer?.target).not.toBe(employer);
      // When retainId is true, nested objects also retain their IDs
      expect(cloned.employer?.target?.id).toBe(employer.id);
      expect(cloned.employer?.target?.name).toBe(employer.name);
    });

    test('clone preserves schema type', ({ expect }) => {
      const person = Obj.make(TestSchema.Person, {
        name: 'Alice',
        email: 'alice@example.com',
        username: 'alice',
      });

      const cloned = Obj.clone(person);

      expect(Obj.instanceOf(TestSchema.Person, cloned)).toBe(true);
      expect(Obj.getSchema(cloned)).toBe(Obj.getSchema(person));
    });
  });

  describe('type-level tests', () => {
    test('Obj.Unknown does not allow arbitrary property access', () => {
      // Obj.Unknown only exposes `id` - no arbitrary properties.
      expectTypeOf<Obj.Unknown>().toHaveProperty('id');
      expectTypeOf<Obj.Unknown>().not.toHaveProperty('name');
      expectTypeOf<Obj.Unknown>().not.toHaveProperty('foo');

      // Accessing an unknown property should be a type error.
      // This verifies that Obj.Unknown is NOT an index signature type.
      type HasName = Obj.Unknown extends { name: unknown } ? true : false;
      expectTypeOf<HasName>().toEqualTypeOf<false>();
    });

    test('Obj.Any allows arbitrary property access via index signature', () => {
      // Obj.Any has an index signature allowing any string key.
      expectTypeOf<Obj.Any>().toHaveProperty('id');

      // Any string key returns `any`.
      type AnyPropertyType = Obj.Any['anyArbitraryProperty'];
      expectTypeOf<AnyPropertyType>().toBeAny();

      // This verifies that Obj.Any IS an index signature type.
      type HasIndexSignature = Obj.Any extends { [key: string]: any } ? true : false;
      expectTypeOf<HasIndexSignature>().toEqualTypeOf<true>();
    });

    test('Obj.Unknown and Obj.Any are mutually assignable', () => {
      // Both types are mutually assignable due to structural typing.
      // The key difference is in property ACCESS, not assignability:
      // - Obj.Unknown: cannot access arbitrary properties (no index signature)
      // - Obj.Any: can access arbitrary properties (has [key: string]: any)
      expectTypeOf<Obj.Unknown>().toMatchTypeOf<Obj.Any>();
      expectTypeOf<Obj.Any>().toMatchTypeOf<Obj.Unknown>();
    });
  });
});
