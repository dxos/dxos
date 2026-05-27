//
// Copyright 2025 DXOS.org
//

import { afterEach, assert, beforeEach, describe, expect, test } from 'vitest';

import { Filter, type Hypergraph, Obj, Query, Relation } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { EchoTestBuilder } from '../testing';
import { type EchoDatabase } from './database';

describe('Relations', () => {
  let testBuilder: EchoTestBuilder;
  let db: EchoDatabase;
  let graph: Hypergraph.Hypergraph;

  beforeEach(async () => {
    testBuilder = await new EchoTestBuilder().open();
    ({ db, graph } = await testBuilder.createDatabase());
    await graph.schemaRegistry.register([TestSchema.Person, TestSchema.Organization, TestSchema.EmployedBy]);
  });

  afterEach(async () => {
    await testBuilder.close();
  });

  test('getSource throws when source object is deleted', async ({ expect }) => {
    // Normal setup: all three objects in the same database.
    const person = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
    const org = db.add(Obj.make(TestSchema.Organization, { name: 'DXOS' }));
    const relation = db.add(
      Relation.make(TestSchema.EmployedBy, {
        [Relation.Source]: person,
        [Relation.Target]: org,
        role: 'CEO',
      }),
    );

    // Delete the source. The core stays in _objects (deletion just marks it),
    // so _areDepsSatisfied passes and the relation surfaces in queries — but
    // getObjectById excludes deleted objects by default, so resolveSync returns
    // undefined and getSource throws.
    db.remove(person);

    // getSourceURI always works — reads the stored raw DXN reference.
    expect(Relation.getSourceURI(relation)).toBeDefined();

    // getSource resolves via getObjectById without { deleted: true } → throws.
    expect(() => Relation.getSource(relation)).toThrow('Relation source could not be resolved');

    // Taking a snapshot silently drops the unresolvable RelationSourceId,
    // so getSource on the snapshot also throws — this was the ObjectsTree crash.
    const snapshot = Relation.getSnapshot(relation);
    expect(Relation.isSnapshot(snapshot)).toBe(true);
    expect(() => Relation.getSource(snapshot)).toThrow('Relation source could not be resolved');
    expect(Relation.getSourceURI(snapshot)).toBeDefined();
  });

  test('create relation between two objects', async () => {
    const person = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
    const org = db.add(Obj.make(TestSchema.Organization, { name: 'DXOS' }));

    const manager = db.add(
      Relation.make(TestSchema.EmployedBy, {
        [Relation.Source]: person,
        [Relation.Target]: org,
        role: 'CEO',
      }),
    );

    expect(Relation.isRelation(manager)).to.be.true;
    expect(Relation.getSource(manager) === person).to.be.true;
    expect(Relation.getTarget(manager) === org).to.be.true;

    await db.flush();
    await testBuilder.lastPeer!.reload();
    {
      const db = await testBuilder.lastPeer!.openLastDatabase();
      const objects = await db.query(Query.select(Filter.everything())).run();

      const manager = objects.find((obj) => Obj.instanceOf(TestSchema.EmployedBy, obj));
      assert(manager, 'manager not found');

      expect(Relation.isRelation(manager)).to.be.true;
      expect(Relation.getSource(manager).name).toEqual('Alice');
      expect(Relation.getTarget(manager).name).toEqual('DXOS');
      expect(manager.role).toBe('CEO');
    }
  });
});
