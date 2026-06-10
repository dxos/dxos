//
// Copyright 2026 DXOS.org
//

import * as Registry from '@effect-atom/atom/Registry';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { DXN, Filter, Obj, Query, QueryResult, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { SpaceId } from '@dxos/keys';

import { type EchoDatabase } from '../proxy-db/database';
import { makeRegistry } from '../registry/registry';
import { EchoTestBuilder } from '../testing';

const TestItem = Schema.Struct({
  name: Schema.String,
  value: Schema.Number,
}).pipe(Type.makeObject(DXN.make('com.example.type.testItem', '0.1.0')));
type TestItem = Type.InstanceType<typeof TestItem>;

const TestItem2 = Schema.Struct({
  title: Schema.String,
}).pipe(Type.makeObject(DXN.make('com.example.type.testItem2', '0.1.0')));

describe('QueryResult per-instance atom getter', () => {
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

  test('creates atom with initial results', async ({ expect }) => {
    db.add(Obj.make(TestItem, { name: 'Object 1', value: 100 }));
    db.add(Obj.make(TestItem, { name: 'Object 2', value: 100 }));
    await db.flush();

    const queryResult = db.query(Query.select(Filter.type(TestItem, { value: 100 })));
    await queryResult.run();

    const results = registry.get(queryResult.atom);

    expect(results).toHaveLength(2);
    expect(results.map((result) => result.name).sort()).toEqual(['Object 1', 'Object 2']);
  });

  test('memoizes the atom per instance', async ({ expect }) => {
    const queryResult = db.query(Query.select(Filter.type(TestItem, { value: 100 })));
    expect(queryResult.atom).toBe(queryResult.atom);
  });

  test('registry.subscribe fires on QueryResult changes', async ({ expect }) => {
    db.add(Obj.make(TestItem, { name: 'Initial', value: 200 }));
    await db.flush();

    const queryResult = db.query(Query.select(Filter.type(TestItem, { value: 200 })));
    await queryResult.run();

    expect(registry.get(queryResult.atom)).toHaveLength(1);

    let updateCount = 0;
    let latestResults: TestItem[] = [];
    registry.subscribe(queryResult.atom, () => {
      updateCount++;
      latestResults = registry.get(queryResult.atom);
    });

    db.add(Obj.make(TestItem, { name: 'New Object', value: 200 }));
    await db.flush({ updates: true });

    expect(updateCount).toBeGreaterThan(0);
    expect(latestResults).toHaveLength(2);
  });

  test('registry.subscribe fires when objects are removed', async ({ expect }) => {
    const obj1 = db.add(Obj.make(TestItem, { name: 'Object 1', value: 300 }));
    db.add(Obj.make(TestItem, { name: 'Object 2', value: 300 }));
    await db.flush();

    const queryResult = db.query(Query.select(Filter.type(TestItem, { value: 300 })));
    await queryResult.run();

    expect(registry.get(queryResult.atom)).toHaveLength(2);

    let updateCount = 0;
    let latestResults: TestItem[] = [];
    registry.subscribe(queryResult.atom, () => {
      updateCount++;
      latestResults = registry.get(queryResult.atom);
    });

    db.remove(obj1);
    await db.flush({ updates: true });

    expect(updateCount).toBeGreaterThan(0);
    expect(latestResults).toHaveLength(1);
    expect(latestResults[0].name).toBe('Object 2');
  });

  test('unsubscribing from registry stops receiving updates', async ({ expect }) => {
    db.add(Obj.make(TestItem, { name: 'Initial', value: 400 }));
    await db.flush();

    const queryResult = db.query(Query.select(Filter.type(TestItem, { value: 400 })));
    await queryResult.run();

    expect(registry.get(queryResult.atom)).toHaveLength(1);

    let updateCount = 0;
    const unsubscribe = registry.subscribe(queryResult.atom, () => {
      updateCount++;
    });

    db.add(Obj.make(TestItem, { name: 'Object 2', value: 400 }));
    await db.flush({ updates: true });
    const countAfterFirstAdd = updateCount;
    expect(countAfterFirstAdd).toBeGreaterThan(0);

    unsubscribe();

    db.add(Obj.make(TestItem, { name: 'Object 3', value: 400 }));
    await db.flush({ updates: true });

    expect(updateCount).toBe(countAfterFirstAdd);
  });

  test('works with empty query results', async ({ expect }) => {
    const queryResult = db.query(Query.select(Filter.type(TestItem, { value: 999 })));
    await queryResult.run();

    expect(registry.get(queryResult.atom)).toHaveLength(0);
  });
});

describe('QueryResult.atom (memoized family)', () => {
  let atomRegistry: Registry.Registry;

  beforeEach(() => {
    atomRegistry = Registry.make();
  });

  test('memoizes per registry instance', ({ expect }) => {
    const registry = makeRegistry({ initial: [TestItem] });

    // Same queryable + filter must yield the same atom instance. Otherwise reactive connectors
    // re-create the atom on every recompute, opening a new query subscription each run and leaking
    // it (the type-create freeze regression).
    const atom1 = QueryResult.atom(registry, Filter.type(Type.Type));
    const atom2 = QueryResult.atom(registry, Filter.type(Type.Type));
    expect(atom1).toBe(atom2);

    const otherRegistry = makeRegistry({ initial: [TestItem] });
    expect(QueryResult.atom(otherRegistry, Filter.type(Type.Type))).not.toBe(atom1);
  });

  test('queries registry type entities', ({ expect }) => {
    const registry = makeRegistry({ initial: [TestItem] });

    const atom = QueryResult.atom(registry, Filter.type(Type.Type));
    const results = atomRegistry.get(atom);

    expect(results.map((type) => Type.getTypename(type))).toContain('com.example.type.testItem');
  });

  test('updates when registry contents change', ({ expect }) => {
    const registry = makeRegistry({ initial: [TestItem] });

    const atom = QueryResult.atom(registry, Filter.type(Type.Type));
    expect(atomRegistry.get(atom)).toHaveLength(1);

    let updateCount = 0;
    atomRegistry.subscribe(atom, () => {
      updateCount++;
    });

    registry.add([TestItem2]);

    expect(updateCount).toBeGreaterThan(0);
    expect(atomRegistry.get(atom)).toHaveLength(2);
  });
});

describe('QueryResult.atom on queues', () => {
  let testBuilder: EchoTestBuilder;
  let registry: Registry.Registry;

  beforeEach(async () => {
    testBuilder = await new EchoTestBuilder().open();
    registry = Registry.make();
  });

  afterEach(async () => {
    await testBuilder.close();
  });

  test('Filter.type on queue', async ({ expect }) => {
    const peer = await testBuilder.createPeer({ types: [TestSchema.Person] });
    const spaceId = SpaceId.random();
    const queues = peer.client.constructQueueFactory(spaceId);
    const queue = queues.create();

    const john = Obj.make(TestSchema.Person, { name: 'john' });
    const jane = Obj.make(TestSchema.Person, { name: 'jane' });
    await queue.append([john, jane]);

    const directResult = await queue.query(Query.select(Filter.type(TestSchema.Person))).run();
    expect(directResult).toHaveLength(2);

    const atom = QueryResult.atom<TestSchema.Person>(queue, Filter.type(TestSchema.Person));
    const results = registry.get(atom);

    expect(results).toHaveLength(2);
    expect(results.map((result) => result.name).sort()).toEqual(['jane', 'john']);
  });

  test('Filter.id on queue', async ({ expect }) => {
    const peer = await testBuilder.createPeer({ types: [TestSchema.Person] });
    const spaceId = SpaceId.random();
    const queues = peer.client.constructQueueFactory(spaceId);
    const queue = queues.create();

    const john = Obj.make(TestSchema.Person, { name: 'john' });
    const jane = Obj.make(TestSchema.Person, { name: 'jane' });
    const alice = Obj.make(TestSchema.Person, { name: 'alice' });
    await queue.append([john, jane, alice]);

    const directResult = await queue.query(Query.select(Filter.id(jane.id))).run();
    expect(directResult).toHaveLength(1);

    const atom = QueryResult.atom<TestSchema.Person>(queue, Filter.id(jane.id));
    const results = registry.get(atom);

    expect(results).toHaveLength(1);
    expect(results[0].id).toEqual(jane.id);
    expect(results[0].name).toEqual('jane');
  });
});
