//
// Copyright 2025 DXOS.org
//

import { afterEach } from 'node:test';
import { beforeEach, describe, expect, test } from 'vitest';

import { RelationSourceId, RelationTargetId } from '@dxos/echo-schema';
import { Contact, HasManager } from '@dxos/echo-schema/testing';
import { create, makeRef } from '@dxos/live-object';

import type { EchoDatabase } from './database';
import { getSource, getTarget, isRelation } from '../echo-handler/relations';
import type { Hypergraph } from '../hypergraph';
import { EchoTestBuilder } from '../testing';

describe('Relations', () => {
  let testBuilder: EchoTestBuilder, db: EchoDatabase, graph: Hypergraph;

  beforeEach(async () => {
    testBuilder = await new EchoTestBuilder().open();
    ({ db, graph } = await testBuilder.createDatabase());

    graph.schemaRegistry.addSchema([Contact, HasManager]);
  });

  afterEach(async () => {
    await testBuilder.close();
  });

  test('create relation between two objects', async () => {
    const alice = db.add(
      create(Contact, {
        name: 'Alice',
      }),
    );
    const bob = db.add(
      create(Contact, {
        name: 'Bob',
      }),
    );
    const hasManager = db.add(
      create(HasManager, {
        [RelationSourceId]: makeRef(bob),
        [RelationTargetId]: makeRef(alice),
        since: '2022',
      }),
    );

    expect(isRelation(hasManager)).to.be.true;
    expect(getSource(hasManager).target! === bob).to.be.true;
    expect(getTarget(hasManager).target! === alice).to.be.true;
    expect(hasManager.since).to.equal('2022');

    await db.flush({ indexes: true });
    await testBuilder.lastPeer!.reload();
    {
      const db = await testBuilder.lastPeer!.openLastDatabase();
      const { objects } = await db.query().run();
      const HasManager = objects.find((obj) => isRelation(obj));

      expect(HasManager).toBeDefined();
      expect(isRelation(HasManager!)).to.be.true;
      expect(getSource(HasManager!).target!.name).toEqual('Bob');
      expect(getTarget(HasManager!).target!.name).toEqual('Alice');
      expect(HasManager!.since).to.equal('2022');
    }
  });
});
