//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Query, Relation } from '@dxos/echo';
import { Obj } from '@dxos/echo';
import { TestingDeprecated } from '@dxos/echo/testing';

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
    graph.schemaRegistry.addSchema([TestingDeprecated.Person, TestingDeprecated.HasManager]);
  });

  afterEach(async () => {
    await testBuilder.close();
  });

  test('create relation between two objects', async () => {
    const user1 = db.add(Obj.make(TestingDeprecated.Person, { name: 'Alice' }));
    const user2 = db.add(Obj.make(TestingDeprecated.Person, { name: 'Bob' }));

    const supervisor = db.add(
      Relation.make(TestingDeprecated.HasManager, {
        [Relation.Source]: user1,
        [Relation.Target]: user2,
        // since: '2022',
      }),
    );

    expect(Relation.isRelation(supervisor)).to.be.true;
    expect(Relation.getSource(supervisor) === user1).to.be.true;
    expect(Relation.getTarget(supervisor) === user2).to.be.true;
    expect(supervisor.since).to.equal('2022');

    await db.flush({ indexes: true });
    await testBuilder.lastPeer!.reload();
    {
      const db = await testBuilder.lastPeer!.openLastDatabase();
      const { objects } = await db.query(Query.select(Filter.everything())).run();

      const supervisor = objects.find((obj) => Relation.isRelation(obj));
      expect(supervisor).toBeDefined();

      expect(Relation.isRelation(supervisor)).to.be.true;
      expect(Relation.getSource(supervisor).name).toEqual('Alice');
      expect(Relation.getTarget(supervisor).name).toEqual('Bob');
      expect(supervisor.since).to.equal('2022');
    }
  });
});
