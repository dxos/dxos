//
// Copyright 2025 DXOS.org
//

import * as Registry from '@effect-atom/atom/Registry';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Obj, type QueryResult, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { type EchoDatabase, Filter, Query } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { SpaceId } from '@dxos/keys';

import * as AtomQuery from './query-atom';

/**
 * Test schema for query-atom tests.
 */
const TestItem = Schema.Struct({
  name: Schema.String,
  value: Schema.Number,
}).pipe(
  Type.object({
    typename: 'example.com/type/TestItem',
    version: '0.1.0',
  }),
);
type TestItem = Schema.Schema.Type<typeof TestItem>;

describe('AtomQuery', () => {
  let testBuilder: EchoTestBuilder;
  let db: EchoDatabase;
  let registry: Registry.Registry;

  beforeEach(async () => {
    testBuilder = await new EchoTestBuilder().open();
    const { db: database } = await testBuilder.createDatabase({ types: [TestItem] });
    db = database;
    registry = Registry.make();
  });

  afterEach(async () => {
    await testBuilder.close();
  });

  test('creates atom with initial results', async () => {
    db.add(Obj.make(TestItem, { name: 'Object 1', value: 100 }));
    db.add(Obj.make(TestItem, { name: 'Object 2', value: 100 }));
    await db.flush({ indexes: true });

    const queryResult: QueryResult.QueryResult<TestItem> = db.query(
      Query.select(Filter.type(TestItem, { value: 100 })),
    );
    await queryResult.run();

    const atom = AtomQuery.fromQuery(queryResult);
    const results = registry.get(atom);

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.name).sort()).toEqual(['Object 1', 'Object 2']);
  });

  test('registry.subscribe fires on QueryResult changes', async () => {
    db.add(Obj.make(TestItem, { name: 'Initial', value: 200 }));
    await db.flush({ indexes: true });

    const queryResult: QueryResult.QueryResult<TestItem> = db.query(
      Query.select(Filter.type(TestItem, { value: 200 })),
    );
    await queryResult.run();

    const atom = AtomQuery.fromQuery(queryResult);

    // Get initial results.
    const initialResults = registry.get(atom);
    expect(initialResults).toHaveLength(1);

    // Subscribe to atom updates.
    let updateCount = 0;
    let latestResults: TestItem[] = [];
    registry.subscribe(atom, () => {
      updateCount++;
      latestResults = registry.get(atom);
    });

    // Add a new object that matches the query.
    db.add(Obj.make(TestItem, { name: 'New Object', value: 200 }));
    await db.flush({ indexes: true, updates: true });

    // Subscription should have fired.
    expect(updateCount).toBeGreaterThan(0);
    expect(latestResults).toHaveLength(2);
  });

  test('registry.subscribe fires when objects are removed', async () => {
    const obj1 = db.add(Obj.make(TestItem, { name: 'Object 1', value: 300 }));
    db.add(Obj.make(TestItem, { name: 'Object 2', value: 300 }));
    await db.flush({ indexes: true });

    const queryResult: QueryResult.QueryResult<TestItem> = db.query(
      Query.select(Filter.type(TestItem, { value: 300 })),
    );
    await queryResult.run();

    const atom = AtomQuery.fromQuery(queryResult);

    // Get initial results.
    const initialResults = registry.get(atom);
    expect(initialResults).toHaveLength(2);

    // Subscribe to atom updates.
    let updateCount = 0;
    let latestResults: TestItem[] = [];
    registry.subscribe(atom, () => {
      updateCount++;
      latestResults = registry.get(atom);
    });

    // Remove an object.
    db.remove(obj1);
    await db.flush({ indexes: true, updates: true });

    // Subscription should have fired.
    expect(updateCount).toBeGreaterThan(0);
    expect(latestResults).toHaveLength(1);
    expect(latestResults[0].name).toBe('Object 2');
  });

  test('unsubscribing from registry stops receiving updates', async () => {
    db.add(Obj.make(TestItem, { name: 'Initial', value: 400 }));
    await db.flush({ indexes: true });

    const queryResult: QueryResult.QueryResult<TestItem> = db.query(
      Query.select(Filter.type(TestItem, { value: 400 })),
    );
    await queryResult.run();

    const atom = AtomQuery.fromQuery(queryResult);

    // Initialize the atom by getting its value first.
    const initialResults = registry.get(atom);
    expect(initialResults).toHaveLength(1);

    // Subscribe to atom updates.
    let updateCount = 0;
    const unsubscribe = registry.subscribe(atom, () => {
      updateCount++;
    });

    // Add object and verify subscription fires.
    db.add(Obj.make(TestItem, { name: 'Object 2', value: 400 }));
    await db.flush({ indexes: true, updates: true });
    const countAfterFirstAdd = updateCount;
    expect(countAfterFirstAdd).toBeGreaterThan(0);

    // Unsubscribe.
    unsubscribe();

    // Add another object.
    db.add(Obj.make(TestItem, { name: 'Object 3', value: 400 }));
    await db.flush({ indexes: true, updates: true });

    // Update count should not have changed after unsubscribe.
    expect(updateCount).toBe(countAfterFirstAdd);
  });

  test('works with empty query results', async () => {
    const queryResult: QueryResult.QueryResult<TestItem> = db.query(
      Query.select(Filter.type(TestItem, { value: 999 })),
    );
    await queryResult.run();

    const atom = AtomQuery.fromQuery(queryResult);
    const results = registry.get(atom);

    expect(results).toHaveLength(0);
  });

  test('multiple atoms from same query share underlying subscription', async () => {
    db.add(Obj.make(TestItem, { name: 'Object', value: 500 }));
    await db.flush({ indexes: true });

    const queryResult: QueryResult.QueryResult<TestItem> = db.query(
      Query.select(Filter.type(TestItem, { value: 500 })),
    );
    await queryResult.run();

    // Create two atoms from the same query result.
    const atom1 = AtomQuery.fromQuery(queryResult);
    const atom2 = AtomQuery.fromQuery(queryResult);

    // Both should return the same results.
    const results1 = registry.get(atom1);
    const results2 = registry.get(atom2);

    expect(results1).toHaveLength(1);
    expect(results2).toHaveLength(1);
    expect(results1[0].name).toBe('Object');
    expect(results2[0].name).toBe('Object');
  });
});

describe('AtomQuery with queues', () => {
  let testBuilder: EchoTestBuilder;
  let registry: Registry.Registry;

  beforeEach(async () => {
    testBuilder = await new EchoTestBuilder().open();
    registry = Registry.make();
  });

  afterEach(async () => {
    await testBuilder.close();
  });

  test('AtomQuery.make with Filter.type on queue', async () => {
    const peer = await testBuilder.createPeer({ types: [TestSchema.Person] });
    const spaceId = SpaceId.random();
    const queues = peer.client.constructQueueFactory(spaceId);
    const queue = queues.create();

    const john = Obj.make(TestSchema.Person, { name: 'john' });
    const jane = Obj.make(TestSchema.Person, { name: 'jane' });
    await queue.append([john, jane]);

    // Verify queue.query works directly (sanity check).
    const directResult = await queue.query(Query.select(Filter.type(TestSchema.Person))).run();
    expect(directResult).toHaveLength(2);

    // Now test AtomQuery.make.
    const atom = AtomQuery.make<TestSchema.Person>(queue, Filter.type(TestSchema.Person));
    const results = registry.get(atom);

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.name).sort()).toEqual(['jane', 'john']);
  });

  test('AtomQuery.make with Filter.id on queue', async () => {
    const peer = await testBuilder.createPeer({ types: [TestSchema.Person] });
    const spaceId = SpaceId.random();
    const queues = peer.client.constructQueueFactory(spaceId);
    const queue = queues.create();

    const john = Obj.make(TestSchema.Person, { name: 'john' });
    const jane = Obj.make(TestSchema.Person, { name: 'jane' });
    const alice = Obj.make(TestSchema.Person, { name: 'alice' });
    await queue.append([john, jane, alice]);

    // Verify queue.query works directly (sanity check).
    const directResult = await queue.query(Query.select(Filter.id(jane.id))).run();
    expect(directResult).toHaveLength(1);

    // Use AtomQuery.make with Filter.id - this is what app-graph-builder uses.
    const atom = AtomQuery.make<TestSchema.Person>(queue, Filter.id(jane.id));
    const results = registry.get(atom);

    expect(results).toHaveLength(1);
    expect(results[0].id).toEqual(jane.id);
    expect(results[0].name).toEqual('jane');
  });
});
