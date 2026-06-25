//
// Copyright 2026 DXOS.org
//

import { describe, expectTypeOf, test, expect } from 'vitest';

import { EID } from '@dxos/keys';

import * as Entity from './Entity';
import { SnapshotKindId } from './internal';
import * as Obj from './Obj';
import * as Ref from './Ref';
import * as Relation from './Relation';
import { TestSchema } from './testing';
import type * as Type from './Type';

describe('Obj', () => {
  describe('make', () => {
    test('generates a random id when none is provided', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Alice' });
      expect(obj.id).toBeDefined();
      expect(obj.id.length).toBeGreaterThan(0);
    });

    test('uses the provided id at creation time', ({ expect }) => {
      const a = Obj.make(TestSchema.Person, { name: 'Alice' });
      const b = Obj.make(TestSchema.Person, { name: 'Bob', id: a.id });
      expect(b.id).toBe(a.id);
    });

    test('rejects an invalid id format', ({ expect }) => {
      expect(() => Obj.make(TestSchema.Person, { name: 'Alice', id: 'not-a-ulid' })).toThrow(
        /Invalid object id format/,
      );
    });
  });

  describe('getSnapshot', () => {
    test('getSnapshot returns an immutable snapshot with SnapshotKindId', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });
      const snapshot = Obj.getSnapshot(obj);

      // Snapshot has SnapshotKindId, not KindId.
      expect(snapshot[SnapshotKindId]).toBe(Entity.Kind.Object);
      expect((snapshot as any)[Entity.KindId]).toBeUndefined();
      expect(Obj.isSnapshot(snapshot)).toBe(true);
      expect(Relation.isSnapshot(snapshot)).toBe(false);
      expect(Entity.isEntity(snapshot)).toBe(false);
      expect(Entity.isSnapshot(snapshot)).toBe(true);

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
      expect(Obj.getURI(obj)).toBeDefined();
      expect(Obj.getURI(snapshot)).toBeDefined();

      // getTypename - works with both.
      expect(Obj.getTypename(obj)).toBe('com.example.type.person');
      expect(Obj.getTypename(snapshot)).toBe('com.example.type.person');

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

    test('getSnapshot preserves parent', ({ expect }) => {
      const parent = Obj.make(TestSchema.Organization, { name: 'parent' });
      const child = Obj.make(TestSchema.Person, { name: 'child' });
      Obj.setParent(child, parent);

      const snapshot = Obj.getSnapshot(child);

      expect(Obj.getParent(child)).toBe(parent);
      expect(Obj.getParent(snapshot)).toBe(parent);
    });
  });

  describe('getURI', () => {
    test('default returns EID', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Alice' });
      const uri = Obj.getURI(obj);
      expect(EID.isEID(uri)).toBe(true);
    });

    test("prefer: 'relative' returns local EID echo:/<id>", ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Alice' });
      const uri = Obj.getURI(obj, { prefer: 'relative' });
      expect(uri).toMatch(/^echo:\/[^/]/);
      expect(EID.isLocal(EID.parse(uri))).toBe(true);
    });

    test("prefer: 'relative' works with snapshot", ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Alice' });
      const snapshot = Obj.getSnapshot(obj);
      expect(Obj.getURI(snapshot, { prefer: 'relative' })).toBe(Obj.getURI(obj, { prefer: 'relative' }));
    });

    test("prefer: 'named' returns dxn: URI when meta.key is set", ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, {
        [Obj.Meta]: { key: 'org.dxos.skill.webSearch' },
        name: 'Alice',
      });
      const uri = Obj.getURI(obj, { prefer: 'named' });
      expect(uri).toBe('dxn:org.dxos.skill.webSearch');
    });

    test("prefer: 'named' falls back to EID when meta.key is absent", ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Alice' });
      const uri = Obj.getURI(obj, { prefer: 'named' });
      expect(EID.isEID(uri)).toBe(true);
    });

    test("prefer: 'named' handles key with hyphens (falls back to raw key URI)", ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, {
        [Obj.Meta]: { key: 'org.dxos.skill.web-search' },
        name: 'Alice',
      });
      // Hyphens in the final DXN segment are invalid; falls back to the raw key as URI.
      const uri = Obj.getURI(obj, { prefer: 'named' });
      expect(uri).toBe('org.dxos.skill.web-search');
    });

    test("prefer: 'absolute' falls back to current EID when object has no database", ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Alice' });
      // Without a database the space id is unknown; result is at least a valid EID.
      const uri = Obj.getURI(obj, { prefer: 'absolute' });
      expect(EID.isEID(uri)).toBe(true);
    });

    test("prefer: 'relative' returns the same local EID for reactive and snapshot", ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Alice' });
      const snapshot = Obj.getSnapshot(obj);
      expect(Obj.getURI(snapshot, { prefer: 'relative' })).toBe(Obj.getURI(obj, { prefer: 'relative' }));
    });

    test("prefer: 'named' works the same on snapshot as on reactive (meta.key is preserved)", ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, {
        [Obj.Meta]: { key: 'com.example.foo' },
        name: 'Alice',
      });
      const snapshot = Obj.getSnapshot(obj);
      expect(Obj.getURI(snapshot, { prefer: 'named' })).toBe(Obj.getURI(obj, { prefer: 'named' }));
      expect(Obj.getURI(snapshot, { prefer: 'named' })).toBe('dxn:com.example.foo');
    });
  });

  describe('snapshotOf', () => {
    test('returns true for snapshot of matching schema', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });
      const snapshot = Obj.getSnapshot(obj);

      expect(Obj.snapshotOf(TestSchema.Person, snapshot)).toBe(true);
      expect(Obj.snapshotOf(TestSchema.Organization, snapshot)).toBe(false);
    });

    test('returns false for reactive object', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });

      expect(Obj.snapshotOf(TestSchema.Person, obj)).toBe(false);
    });

    test('returns false for plain object with matching shape', ({ expect }) => {
      const plain = { id: 'test', name: 'Test' };

      expect(Obj.snapshotOf(TestSchema.Person, plain)).toBe(false);
    });

    test('curried form works', ({ expect }) => {
      const snapshot = Obj.getSnapshot(Obj.make(TestSchema.Person, { name: 'Test' }));
      const isPersonSnapshot = Obj.snapshotOf(TestSchema.Person);

      expect(isPersonSnapshot(snapshot)).toBe(true);
      expect(isPersonSnapshot({})).toBe(false);
    });
  });

  describe('getKeys', () => {
    const SOURCE = 'test-source';

    test('returns keys from reactive object and snapshot', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });
      Obj.update(obj, (obj) => {
        const meta = Obj.getMeta(obj);
        meta.keys.push({ source: SOURCE, id: 'key-1' });
        meta.keys.push({ source: SOURCE, id: 'key-2' });
        meta.keys.push({ source: 'other', id: 'key-3' });
      });

      expect(Obj.getKeys(obj, SOURCE)).toHaveLength(2);
      expect(Obj.getKeys(obj, SOURCE).map((k) => k.id)).toEqual(['key-1', 'key-2']);

      const snapshot = Obj.getSnapshot(obj);
      expect(Obj.getKeys(snapshot, SOURCE)).toHaveLength(2);
      expect(Obj.getKeys(snapshot, SOURCE).map((k) => k.id)).toEqual(['key-1', 'key-2']);
    });

    test('throws for plain object without metadata', ({ expect }) => {
      const plain = { id: 'plain-1', name: 'Plain' };
      expect(() => Obj.getKeys(plain as any, SOURCE)).toThrow(/EntityMeta not found/);
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

      Obj.update(original, (original) => {
        original.name = 'Bob';
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
      Obj.update(employer, (employer) => {
        employer.name = 'Updated DXOS';
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

      const cloned = Obj.clone(person, { deep: 'all' });

      expect(cloned.employer).not.toBe(person.employer);
      expect(cloned.employer?.target).not.toBe(employer);
      expect(cloned.employer?.target?.id).not.toBe(employer.id);
      expect(cloned.employer?.target?.name).toBe(employer.name);

      // Modifying the original referenced object does not affect the clone
      Obj.update(employer, (employer) => {
        employer.name = 'Updated DXOS';
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

      const cloned = Obj.clone(person, { deep: 'all' });

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

      const cloned = Obj.clone(person, { deep: 'all' });

      expect(cloned.employer).toBeDefined();
      expect(cloned.employer?.target).toBeDefined();
      expect(cloned.employer?.target?.name).toBe('DXOS');

      // Test with undefined optional reference
      const personWithoutEmployer = Obj.make(TestSchema.Person, {
        name: 'Bob',
        email: 'bob@example.com',
        username: 'bob',
      });

      const clonedWithoutEmployer = Obj.clone(personWithoutEmployer, { deep: 'all' });
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

      const cloned = Obj.clone(person, { deep: 'all' });

      expect(cloned.address?.city).toBe('San Francisco');
      expect(cloned.address?.state).toBe('CA');
      expect(cloned.address?.zip).toBe('94102');
      expect(cloned.address?.coordinates?.lat).toBe(37.7749);
      expect(cloned.address?.coordinates?.lng).toBe(-122.4194);

      // Modifying nested properties should be independent
      Obj.update(person, (person) => {
        person.address!.city = 'New York';
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

      const cloned = Obj.clone(person, { deep: 'all' });

      expect(cloned.tasks?.length).toBe(3);
      expect(cloned.tasks?.[0]?.target?.title).toBe('Task 1');
      expect(cloned.tasks?.[1]?.target?.title).toBe('Task 2');
      expect(cloned.tasks?.[2]?.target?.title).toBe('Task 3');

      // All referenced tasks should be cloned
      expect(cloned.tasks?.[0]?.target).not.toBe(task1);
      expect(cloned.tasks?.[1]?.target).not.toBe(task2);
      expect(cloned.tasks?.[2]?.target).not.toBe(task3);

      // Modifying original tasks should not affect cloned ones
      Obj.update(task1, (task1) => {
        task1.title = 'Updated Task 1';
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

      const cloned = Obj.clone(person, { deep: 'all', retainId: true });

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
      expect(Obj.getType(cloned)).toBe(Obj.getType(person));
    });

    test("deep: 'owned' clones owned children but shares unowned refs", ({ expect }) => {
      // An owned task (parented to the person) is cloned; a shared task (no parent link) is referenced as-is.
      const ownedTask = Obj.make(TestSchema.Task, { title: 'Owned' });
      const sharedTask = Obj.make(TestSchema.Task, { title: 'Shared' });
      const person = Obj.make(TestSchema.Person, {
        name: 'Alice',
        email: 'alice@example.com',
        username: 'alice',
        tasks: [Ref.make(ownedTask), Ref.make(sharedTask)],
      });
      Obj.setParent(ownedTask, person);

      const cloned = Obj.clone(person, { deep: 'owned' });

      // Owned child is a fresh copy.
      expect(cloned.tasks?.[0]?.target).not.toBe(ownedTask);
      expect(cloned.tasks?.[0]?.target?.id).not.toBe(ownedTask.id);
      expect(cloned.tasks?.[0]?.target?.title).toBe('Owned');
      // Unowned (shared) ref points at the original object.
      expect(cloned.tasks?.[1]?.target).toBe(sharedTask);
    });

    test("deep: 'owned' follows transitive ownership", ({ expect }) => {
      // grandchild ← child ← root: both are cloned because their parent chain reaches the clone root.
      const grandchild = Obj.make(TestSchema.Task, { title: 'Grandchild' });
      const child = Obj.make(TestSchema.Task, { title: 'Child', previous: Ref.make(grandchild) });
      const person = Obj.make(TestSchema.Person, {
        name: 'Alice',
        email: 'alice@example.com',
        username: 'alice',
        tasks: [Ref.make(child)],
      });
      Obj.setParent(child, person);
      Obj.setParent(grandchild, child);

      const cloned = Obj.clone(person, { deep: 'owned' });

      expect(cloned.tasks?.[0]?.target).not.toBe(child);
      expect(cloned.tasks?.[0]?.target?.previous?.target).not.toBe(grandchild);
      expect(cloned.tasks?.[0]?.target?.previous?.target?.title).toBe('Grandchild');
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

  describe('Obj.updateFrom', () => {
    test('returns false when values already match', () => {
      const target = Obj.make(TestSchema.Organization, { name: 'Acme', properties: { region: 'EU' } });
      const source = Obj.make(TestSchema.Organization, { name: 'Acme', properties: { region: 'EU' } });
      Obj.update(target, (target) => {
        expect(Obj.updateFrom(target, source)).toBe(false);
      });
    });

    test('updates scalar and nested record fields on Organization', () => {
      const target = Obj.make(TestSchema.Organization, {
        name: 'Old',
        properties: { a: '1' },
      });
      const source = Obj.make(TestSchema.Organization, {
        name: 'New',
        properties: { a: '2', b: '3' },
      });
      Obj.update(target, (target) => {
        expect(Obj.updateFrom(target, source)).toBe(true);
      });
      expect(target.name).toBe('New');
      expect(target.properties).toEqual({ a: '2', b: '3' });
    });

    test('compares employer refs by DXN and updates Person fields', () => {
      const orgA = Obj.make(TestSchema.Organization, { name: 'A' });
      const orgB = Obj.make(TestSchema.Organization, { name: 'B' });
      const target = Obj.make(TestSchema.Person, {
        name: 'Ann',
        username: 'ann',
        email: 'ann@x.test',
        employer: Ref.make(orgA),
        address: { city: 'X', state: 'Y', zip: '1', coordinates: { lat: 0, lng: 0 } },
      });
      const source = Obj.make(TestSchema.Person, {
        name: 'Ann',
        username: 'ann',
        email: 'ann@x.test',
        employer: Ref.make(orgB),
        address: { city: 'Portland', state: 'OR', zip: '97201', coordinates: { lat: 45.5, lng: -122.6 } },
      });
      Obj.update(target, (target) => {
        expect(Obj.updateFrom(target, source)).toBe(true);
      });
      expect(target.employer?.uri.toString()).toBe(Ref.make(orgB).uri.toString());
      expect(target.address?.city).toBe('Portland');
    });

    test('updates array of task refs when DXNs differ', () => {
      const t1 = Obj.make(TestSchema.Task, { title: 'One' });
      const t2 = Obj.make(TestSchema.Task, { title: 'Two' });
      const t3 = Obj.make(TestSchema.Task, { title: 'Three' });
      const target = Obj.make(TestSchema.Person, {
        name: 'Bob',
        username: 'bob',
        email: 'bob@x.test',
        tasks: [Ref.make(t1), Ref.make(t2)],
      });
      const source = Obj.make(TestSchema.Person, {
        name: 'Bob',
        username: 'bob',
        email: 'bob@x.test',
        tasks: [Ref.make(t1), Ref.make(t3)],
      });
      Obj.update(target, (target) => {
        expect(Obj.updateFrom(target, source)).toBe(true);
      });
      expect(target.tasks?.map((r) => r.uri)).toEqual(source.tasks?.map((r) => r.uri));
    });

    test('respects include option', () => {
      const target = Obj.make(TestSchema.Organization, { name: 'Keep', properties: { x: '1' } });
      const source = Obj.make(TestSchema.Organization, { name: 'Drop', properties: { x: '2' } });
      Obj.update(target, (target) => {
        expect(Obj.updateFrom(target, source, { include: ['properties'] })).toBe(true);
      });
      expect(target.name).toBe('Keep');
      expect(target.properties).toEqual({ x: '2' });
    });

    test('respects exclude option', () => {
      const target = Obj.make(TestSchema.Organization, { name: 'Old', properties: { x: '1' } });
      const source = Obj.make(TestSchema.Organization, { name: 'New', properties: { x: '2' } });
      Obj.update(target, (target) => {
        expect(Obj.updateFrom(target, source, { exclude: ['name'] })).toBe(true);
      });
      expect(target.name).toBe('Old');
      expect(target.properties).toEqual({ x: '2' });
    });
  });

  describe('exemplars', () => {
    test('factory', ({ expect }) => {
      const factory = <S extends Type.AnyObj>(schema: S) => {
        return (props: Obj.MakeProps<S>) => Obj.make(schema, props);
      };

      const makePerson = factory(TestSchema.Person);
      const person = makePerson({ name: 'John Doe' });
      expect(person.name).toBe('John Doe');
    });
  });

  describe('Hierarchy', () => {
    test('setParent and getParent', async () => {
      const parent = Obj.make(TestSchema.Organization, { name: 'parent' });
      const child = Obj.make(TestSchema.Person, { name: 'child' });
      expect(Obj.getParent(child)).toBeUndefined();

      Obj.setParent(child, parent);
      expect(Obj.getParent(child)).toBe(parent);

      Obj.setParent(child, undefined);
      expect(Obj.getParent(child)).toBeUndefined();
    });

    test('create object with Obj.Parent in props', () => {
      const parent = Obj.make(TestSchema.Organization, { name: 'DXOS' });
      const child = Obj.make(TestSchema.Person, {
        [Obj.Parent]: parent,
        name: 'John',
      });

      expect(child.name).toBe('John');
      expect(Obj.getParent(child)).toBe(parent);
    });
  });
});
