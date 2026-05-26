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

  test('getSource throws when source is in a different database (cross-space relation)', async () => {
    // Second database on a separate peer (and thus a separate Hypergraph).
    const { db: db2, graph: graph2 } = await testBuilder.createDatabase();
    await graph2.schemaRegistry.register([TestSchema.Person, TestSchema.Organization, TestSchema.EmployedBy]);

    // Source/target live in db (peer 1).
    const person = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
    const org = db.add(Obj.make(TestSchema.Organization, { name: 'DXOS' }));

    // Relation is stored in db2 (peer 2, different Hypergraph).
    // saveRefs keeps a local DXN in the core (no space ID), so resolveSync
    // looks up person.id inside db2 — where it doesn't exist.
    const relation = db2.add(
      Relation.make(TestSchema.EmployedBy, {
        [Relation.Source]: person,
        [Relation.Target]: org,
        role: 'CEO',
      }),
    );

    // getSourceDXN always works — reads the stored raw reference.
    expect(Relation.getSourceDXN(relation)).toBeDefined();

    // getSource resolves via db2's Hypergraph; person is not there, so it throws.
    expect(() => Relation.getSource(relation)).toThrow('Relation source could not be resolved');

    // Taking a snapshot silently drops the unresolvable RelationSourceId,
    // so getSource on the snapshot also throws — this was the ObjectsTree crash.
    const snapshot = Relation.getSnapshot(relation);
    expect(Relation.isSnapshot(snapshot)).toBe(true);
    expect(() => Relation.getSource(snapshot)).toThrow('Relation source could not be resolved');
    expect(Relation.getSourceDXN(snapshot)).toBeDefined();
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
