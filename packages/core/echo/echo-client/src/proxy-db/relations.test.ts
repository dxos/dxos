//
// Copyright 2025 DXOS.org
//

import { afterEach, assert, beforeEach, describe, expect, test } from 'vitest';

import { type Hypergraph, Filter, Obj, Query, Relation } from '@dxos/echo';
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
    graph.registry.add([TestSchema.Person, TestSchema.Organization, TestSchema.EmployedBy]);
  });

  afterEach(async () => {
    await testBuilder.close();
  });

  test('getSource resolves a deleted source object', async ({ expect }) => {
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

    // Deleting the source only marks it. Resolution is deleted-agnostic — deletion is a query-pipeline
    // filter, not a resolution gate — so the relation keeps resolving its endpoints to the deleted object.
    db.remove(person);

    // getSourceURI always works — reads the stored raw DXN reference.
    expect(Relation.getSourceURI(relation)).toBeDefined();

    const source = Relation.getSource(relation);
    expect(source.id).toEqual(person.id);
    expect(Obj.isDeleted(source)).toBe(true);
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

      const manager = objects.find((obj) => Relation.instanceOf(TestSchema.EmployedBy, obj));
      assert(manager, 'manager not found');

      expect(Relation.isRelation(manager)).to.be.true;
      expect(Relation.getSource(manager).name).toEqual('Alice');
      expect(Relation.getTarget(manager).name).toEqual('DXOS');
      expect(manager.role).toBe('CEO');
    }
  });
});
