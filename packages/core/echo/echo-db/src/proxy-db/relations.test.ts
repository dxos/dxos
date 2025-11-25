//
// Copyright 2025 DXOS.org
//

import { afterEach, assert, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Obj, Query, Relation } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { type Hypergraph } from '../hypergraph';
import { EchoTestBuilder } from '../testing';

import { type EchoDatabase } from './database';

describe('Relations', () => {
  let testBuilder: EchoTestBuilder;
  let db: EchoDatabase;
  let graph: Hypergraph;

  beforeEach(async () => {
    testBuilder = await new EchoTestBuilder().open();
    ({ db, graph } = await testBuilder.createDatabase());
    graph.schemaRegistry.addSchema([TestSchema.Person, TestSchema.HasManager]);
  });

  afterEach(async () => {
    await testBuilder.close();
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

    await db.flush({ indexes: true });
    await testBuilder.lastPeer!.reload();
    {
      const db = await testBuilder.lastPeer!.openLastDatabase();
      const { objects } = await db.query(Query.select(Filter.everything())).run();

      const manager: TestSchema.EmployedBy | undefined = objects.find((obj) => Relation.isRelation(obj));
      assert(manager, 'manager not found');

      expect(Relation.isRelation(manager)).to.be.true;
      expect(Relation.getSource(manager).name).toEqual('Alice');
      expect(Relation.getTarget(manager).name).toEqual('DXOS');
      expect(manager.role).toBe('CEO');
    }
  });
});
