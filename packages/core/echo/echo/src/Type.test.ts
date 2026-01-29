//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Entity from './Entity';
import { type KindId, SnapshotKindId } from './internal';
import * as Obj from './Obj';
import * as Relation from './Relation';
import { TestSchema } from './testing';
import * as Type from './Type';

describe('Type', () => {
  describe('Type.Obj', () => {
    test('has typename and version properties', ({ expect }) => {
      expect(Type.Obj.typename).toBe('dxos.org/schema/AnyObject');
      expect(Type.Obj.version).toBe('0.0.0');
    });

    test('has SchemaKindId for schema type checking', ({ expect }) => {
      // Type.Entity.isObject uses SchemaKindId to check if a schema is an object schema.
      expect(Type.Entity.isObject(Type.Obj)).toBe(true);
      expect(Type.Entity.isObject(TestSchema.Person)).toBe(true);
      expect(Type.Entity.isObject(Type.Relation)).toBe(false);
    });

    test('Schema.is validates structural compatibility only', ({ expect }) => {
      // Schema.is does structural validation (has id field).
      // It accepts both ECHO objects and plain objects with compatible structure.
      // NOTE: Schema.is cannot validate KindId brand because Effect Schema normalizes
      // values to plain objects before validation, stripping proxy properties.
      // Use Obj.isObject() for proper ECHO instance type guards.
      expect(Schema.is(Type.Obj)({ id: 'plain-object' })).toBe(true);
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });
      expect(Schema.is(Type.Obj)(obj)).toBe(true);
    });
  });

  describe('Type.Relation', () => {
    test('has typename and version properties', ({ expect }) => {
      expect(Type.Relation.typename).toBe('dxos.org/schema/AnyRelation');
      expect(Type.Relation.version).toBe('0.0.0');
    });

    test('has SchemaKindId for schema type checking', ({ expect }) => {
      // Type.Entity.isRelation uses SchemaKindId to check if a schema is a relation schema.
      expect(Type.Entity.isRelation(Type.Relation)).toBe(true);
      expect(Type.Entity.isRelation(TestSchema.HasManager)).toBe(true);
      expect(Type.Entity.isRelation(Type.Obj)).toBe(false);
    });

    test('Schema.is validates structural compatibility only', ({ expect }) => {
      // Schema.is does structural validation (has id field).
      // It accepts both ECHO relations and plain objects with compatible structure.
      // NOTE: Schema.is cannot validate KindId brand because Effect Schema normalizes
      // values to plain objects before validation, stripping proxy properties.
      // Use Relation.isRelation() for proper ECHO instance type guards.
      expect(Schema.is(Type.Relation)({ id: 'plain-object' })).toBe(true);
      const obj1 = Obj.make(TestSchema.Person, { name: 'Alice' });
      const obj2 = Obj.make(TestSchema.Person, { name: 'Bob' });
      const rel = Relation.make(TestSchema.HasManager, {
        [Relation.Source]: obj1,
        [Relation.Target]: obj2,
      });
      expect(Schema.is(Type.Relation)(rel)).toBe(true);
    });
  });

  describe('Snapshot Types', () => {
    describe('Obj.Snapshot', () => {
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

        // Snapshot should be frozen.
        expect(Object.isFrozen(snapshot)).toBe(true);
      });

      test('Obj.Base accepts both reactive objects and snapshots', ({ expect }) => {
        const obj = Obj.make(TestSchema.Person, { name: 'Test' });
        const snapshot = Obj.getSnapshot(obj);

        // Both should be usable with Obj.Base-accepting functions.
        // Using getDXN as a representative function that accepts Base.
        expect(() => Obj.getDXN(obj)).not.toThrow();
        expect(() => Obj.getDXN(snapshot)).not.toThrow();
        expect(Obj.getDXN(obj).toString()).toBe(Obj.getDXN(snapshot).toString());
      });

      test('Obj.Unknown only accepts reactive objects for mutations', ({ expect }) => {
        const obj = Obj.make(TestSchema.Person, { name: 'Test' });

        // Mutations work on reactive objects.
        expect(() => Obj.change(obj, (o) => (o.name = 'Updated'))).not.toThrow();
        expect(obj.name).toBe('Updated');

        // Type-level: snapshots should not be assignable to Unknown.
        // This is a type-level test that ensures the types are correct.
        // Runtime: getSnapshot returns a frozen object that will throw on mutation.
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
    });

    describe('Relation.Snapshot', () => {
      test('getSnapshot returns an immutable snapshot with SnapshotKindId', ({ expect }) => {
        const obj1 = Obj.make(TestSchema.Person, { name: 'Alice' });
        const obj2 = Obj.make(TestSchema.Person, { name: 'Bob' });
        const rel = Relation.make(TestSchema.HasManager, {
          [Relation.Source]: obj1,
          [Relation.Target]: obj2,
        });
        const snapshot = Relation.getSnapshot(rel);

        // Snapshot has SnapshotKindId, not KindId.
        expect(snapshot[SnapshotKindId]).toBe(Entity.Kind.Relation);
        expect((snapshot as any)[Entity.KindId]).toBeUndefined();

        // Snapshot has same id.
        expect(snapshot.id).toBe(rel.id);
      });

      test('Relation.Base accepts both reactive relations and snapshots', ({ expect }) => {
        const obj1 = Obj.make(TestSchema.Person, { name: 'Alice' });
        const obj2 = Obj.make(TestSchema.Person, { name: 'Bob' });
        const rel = Relation.make(TestSchema.HasManager, {
          [Relation.Source]: obj1,
          [Relation.Target]: obj2,
        });
        const snapshot = Relation.getSnapshot(rel);

        // Both should be usable with Relation.Base-accepting functions.
        expect(() => Relation.getSourceDXN(rel)).not.toThrow();
        expect(() => Relation.getSourceDXN(snapshot)).not.toThrow();
        expect(Relation.getSourceDXN(rel).toString()).toBe(Relation.getSourceDXN(snapshot).toString());
      });

      test('read-only helpers work with both reactive and snapshot', ({ expect }) => {
        const obj1 = Obj.make(TestSchema.Person, { name: 'Alice' });
        const obj2 = Obj.make(TestSchema.Person, { name: 'Bob' });
        const rel = Relation.make(TestSchema.HasManager, {
          [Relation.Source]: obj1,
          [Relation.Target]: obj2,
        });
        const snapshot = Relation.getSnapshot(rel);

        // getSourceDXN - works with both.
        expect(Relation.getSourceDXN(rel)).toBeDefined();
        expect(Relation.getSourceDXN(snapshot)).toBeDefined();

        // getTargetDXN - works with both.
        expect(Relation.getTargetDXN(rel)).toBeDefined();
        expect(Relation.getTargetDXN(snapshot)).toBeDefined();

        // getSource - works with both.
        expect(Relation.getSource(rel)).toBeDefined();
        expect(Relation.getSource(snapshot)).toBeDefined();

        // getTarget - works with both.
        expect(Relation.getTarget(rel)).toBeDefined();
        expect(Relation.getTarget(snapshot)).toBeDefined();

        // getDXN - works with both.
        expect(Relation.getDXN(rel)).toBeDefined();
        expect(Relation.getDXN(snapshot)).toBeDefined();

        // getTypename - works with both.
        expect(Relation.getTypename(rel)).toBe('example.com/type/HasManager');
        expect(Relation.getTypename(snapshot)).toBe('example.com/type/HasManager');

        // getMeta - works with both.
        expect(Relation.getMeta(rel)).toBeDefined();
        expect(Relation.getMeta(snapshot)).toBeDefined();

        // isDeleted - works with both.
        expect(Relation.isDeleted(rel)).toBe(false);
        expect(Relation.isDeleted(snapshot)).toBe(false);

        // version - works with both.
        expect(Relation.version(rel)).toBeDefined();
        expect(Relation.version(snapshot)).toBeDefined();

        // toJSON - works with both.
        expect(Relation.toJSON(rel)).toBeDefined();
        expect(Relation.toJSON(snapshot)).toBeDefined();
      });
    });

    describe('Entity.Snapshot', () => {
      test('Entity.Base and Entity.Snapshot types exist', ({ expect }) => {
        // These are type-level tests to ensure the types compile correctly.
        // Entity.Base is a union that accepts both reactive and snapshot.
        // Entity.Snapshot is an interface with SnapshotKindId.
        const obj = Obj.make(TestSchema.Person, { name: 'Test' });
        const objSnapshot = Obj.getSnapshot(obj);

        // Both should be assignable to Entity.Base (type-level).
        const _base1: Entity.Base = obj;
        const _base2: Entity.Base = objSnapshot;

        // Snapshot should be assignable to Entity.Snapshot (type-level).
        const _entitySnapshot: Entity.Snapshot = objSnapshot;

        expect(true).toBe(true);
      });
    });

    describe('Type-level tests', () => {
      test('reactive object is not assignable to Snapshot type', ({ expect }) => {
        // This test documents the type-level behavior.
        // A reactive object (with KindId) should NOT be directly assignable to Obj.Snapshot.
        // The TS compiler would catch this as an error if we tried to assign.
        //
        // Example of what would fail at compile time:
        // const obj = Obj.make(TestSchema.Person, { name: 'Test' });
        // const snapshot: Obj.Snapshot<typeof obj> = obj; // ERROR: Types incompatible
        //
        // Instead, you must use getSnapshot():
        // const snapshot: Obj.Snapshot<typeof obj> = Obj.getSnapshot(obj); // OK

        const obj = Obj.make(TestSchema.Person, { name: 'Test' });
        const snapshot = Obj.getSnapshot(obj);

        // Verify at runtime that the brands are different.
        expect(Entity.KindId in obj).toBe(true);
        expect(SnapshotKindId in obj).toBe(false);
        expect(SnapshotKindId in snapshot).toBe(true);
        expect(Entity.KindId in snapshot).toBe(false);
      });

      test('snapshot is not assignable to Unknown type for mutations', ({ expect }) => {
        // This test documents the type-level behavior.
        // A snapshot should NOT be assignable to Obj.Unknown because:
        // 1. Obj.Unknown has KindId, Snapshot has SnapshotKindId
        // 2. Mutation functions only accept Obj.Unknown
        //
        // Example of what would fail at compile time:
        // const snapshot = Obj.getSnapshot(obj);
        // Obj.change(snapshot, (s) => s.name = 'X'); // ERROR: Argument not assignable
        //
        // This ensures accidental mutations on snapshots are caught at compile time.

        expect(true).toBe(true);
      });
    });
  });
});
