//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Query } from '@dxos/echo';
import { RelationSourceId, RelationTargetId } from '@dxos/echo/internal';
import { Testing } from '@dxos/echo-schema/testing';
import { live } from '@dxos/live-object';

import { getSource, getTarget, isRelation } from '../echo-handler';
import type { Hypergraph } from '../hypergraph';
import { EchoTestBuilder } from '../testing';

import type { EchoDatabase } from './database';

describe('Relations', () => {
  let testBuilder: EchoTestBuilder, db: EchoDatabase, graph: Hypergraph;

  beforeEach(async () => {
    testBuilder = await new EchoTestBuilder().open();
    ({ db, graph } = await testBuilder.createDatabase());

    graph.schemaRegistry.addSchema([Testing.Contact, Testing.HasManager]);
  });

  afterEach(async () => {
    await testBuilder.close();
  });

  test('create relation between two objects', async () => {
    const alice = db.add(
      live(Testing.Contact, {
        name: 'Alice',
      }),
    );
    const bob = db.add(
      live(Testing.Contact, {
        name: 'Bob',
      }),
    );
    const hasManager = db.add(
      live(Testing.HasManager, {
        [RelationSourceId]: bob,
        [RelationTargetId]: alice,
        since: '2022',
      }),
    );

    expect(isRelation(hasManager)).to.be.true;
    expect(getSource(hasManager) === bob).to.be.true;
    expect(getTarget(hasManager) === alice).to.be.true;
    expect(hasManager.since).to.equal('2022');

    await db.flush({ indexes: true });
    await testBuilder.lastPeer!.reload();
    {
      const db = await testBuilder.lastPeer!.openLastDatabase();
      const { objects } = await db.query(Query.select(Filter.everything())).run();
      const HasManager = objects.find((obj) => isRelation(obj));

      expect(HasManager).toBeDefined();
      expect(isRelation(HasManager!)).to.be.true;
      expect(getSource(HasManager!).name).toEqual('Bob');
      expect(getTarget(HasManager!).name).toEqual('Alice');
      expect(HasManager!.since).to.equal('2022');
    }
  });
});
