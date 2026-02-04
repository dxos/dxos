//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Entity from './Entity';
import { SnapshotKindId } from './internal';
import * as Obj from './Obj';
import * as Relation from './Relation';
import { TestSchema } from './testing';

describe('Relation', () => {
  describe('Snapshot', () => {
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
});
