//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Entity from './Entity';
import { SnapshotKindId } from './internal';
import * as Obj from './Obj';
import { TestSchema } from './testing';

describe('Obj', () => {
  describe('Snapshot', () => {
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
});
