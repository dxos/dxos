//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Operation, Trigger } from '@dxos/compute';
import { type Database, EID, Feed, Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';

import { createDailySyncTrigger, findSyncOperation, findSyncTrigger } from './sync';
import { Ibkr, IbkrOperation } from './types';

describe('createDailySyncTrigger', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('persists a sync operation and a daily timer trigger that runs it', async ({ expect }) => {
    const { db } = await createDatabase();
    const portfolio = addPortfolio(db);

    const trigger = createDailySyncTrigger(db, portfolio);
    await db.flush();

    expect(trigger.enabled).toBe(true);
    expect(trigger.spec?.kind).toBe('timer');

    const operations = await db.query(Filter.type(Operation.PersistentOperation)).run();
    const triggers = await db.query(Filter.type(Trigger.Trigger)).run();
    expect(operations).toHaveLength(1);
    expect(triggers).toHaveLength(1);

    // The trigger and its operation are parented to the Portfolio so they cascade-delete with it.
    expect(Obj.getParent(trigger)?.id).toBe(portfolio.id);
    expect(Obj.getParent(operations[0])?.id).toBe(portfolio.id);
  });

  test('reuses a provided operation instead of serializing a duplicate', async ({ expect }) => {
    const { db } = await createDatabase();
    const portfolio = addPortfolio(db);

    const operation = db.add(Operation.serialize(IbkrOperation.SyncPortfolioReport));
    const trigger = createDailySyncTrigger(db, portfolio, operation);
    await db.flush();

    const operations = await db.query(Filter.type(Operation.PersistentOperation)).run();
    expect(operations).toHaveLength(1);
    const eid = trigger.runnable?.uri ? EID.tryParse(trigger.runnable.uri) : undefined;
    expect(eid && EID.getEntityId(eid)).toBe(operation.id);
  });

  test('findSyncTrigger / findSyncOperation locate the created trigger', async ({ expect }) => {
    const { db } = await createDatabase();
    const portfolio = addPortfolio(db);

    const created = createDailySyncTrigger(db, portfolio);
    await db.flush();

    const operations = await db.query(Filter.type(Operation.PersistentOperation)).run();
    const triggers = await db.query(Filter.type(Trigger.Trigger)).run();
    expect(findSyncOperation(operations)).toBeDefined();
    expect(findSyncTrigger(triggers, operations)?.id).toBe(created.id);
  });

  test('findSyncTrigger returns undefined before any sync trigger exists', ({ expect }) => {
    expect(findSyncTrigger([], [])).toBeUndefined();
    expect(findSyncOperation([])).toBeUndefined();
  });

  const createDatabase = () =>
    builder.createDatabase({
      types: [Ibkr.Portfolio, Feed.Feed, Trigger.Trigger, Operation.PersistentOperation],
    });

  const addPortfolio = (db: Database.Database): Ibkr.Portfolio => {
    const portfolio = Ibkr.makePortfolio();
    db.add(portfolio);
    return portfolio;
  };
});
