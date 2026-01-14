//
// Copyright 2025 DXOS.org
//

import * as Registry from '@effect-atom/atom/Registry';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Obj, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';

import { AtomQuery } from './query-atom';
import { Filter, Query } from '@dxos/echo-db';

describe('AtomQuery', () => {
  let testBuilder: EchoTestBuilder;
  let db: any;
  let registry: Registry.Registry;

  beforeEach(async () => {
    testBuilder = await new EchoTestBuilder().open();
    const { db: database } = await testBuilder.createDatabase();
    db = database;
    registry = Registry.make();
  });

  afterEach(async () => {
    await testBuilder.close();
  });

  test('creates atom with initial results', async () => {
    db.add(Obj.make(Type.Expando, { name: 'Object 1', value: 100 }));
    db.add(Obj.make(Type.Expando, { name: 'Object 2', value: 100 }));
    await db.flush({ indexes: true });

    const queryResult = db.query(Query.select(Filter.type(Type.Expando, { value: 100 })));
    await queryResult.run();

    const atom = AtomQuery.make(queryResult);
    const results = registry.get(atom);

    expect(results).toHaveLength(2);
    expect(results.map((r: any) => r.name).sort()).toEqual(['Object 1', 'Object 2']);
  });

  test('registry.subscribe fires on QueryResult changes', async () => {
    db.add(Obj.make(Type.Expando, { name: 'Initial', value: 200 }));
    await db.flush({ indexes: true });

    const queryResult = db.query(Query.select(Filter.type(Type.Expando, { value: 200 })));
    await queryResult.run();

    const atom = AtomQuery.make(queryResult);

    // Get initial results.
    const initialResults = registry.get(atom);
    expect(initialResults).toHaveLength(1);

    // Subscribe to atom updates.
    let updateCount = 0;
    let latestResults: any[] = [];
    registry.subscribe(atom, () => {
      updateCount++;
      latestResults = registry.get(atom);
    });

    // Add a new object that matches the query.
    db.add(Obj.make(Type.Expando, { name: 'New Object', value: 200 }));
    await db.flush({ indexes: true, updates: true });

    // Subscription should have fired.
    expect(updateCount).toBeGreaterThan(0);
    expect(latestResults).toHaveLength(2);
  });

  test('registry.subscribe fires when objects are removed', async () => {
    const obj1 = db.add(Obj.make(Type.Expando, { name: 'Object 1', value: 300 }));
    db.add(Obj.make(Type.Expando, { name: 'Object 2', value: 300 }));
    await db.flush({ indexes: true });

    const queryResult = db.query(Query.select(Filter.type(Type.Expando, { value: 300 })));
    await queryResult.run();

    const atom = AtomQuery.make(queryResult);

    // Get initial results.
    const initialResults = registry.get(atom);
    expect(initialResults).toHaveLength(2);

    // Subscribe to atom updates.
    let updateCount = 0;
    let latestResults: any[] = [];
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
    db.add(Obj.make(Type.Expando, { name: 'Initial', value: 400 }));
    await db.flush({ indexes: true });

    const queryResult = db.query(Query.select(Filter.type(Type.Expando, { value: 400 })));
    await queryResult.run();

    const atom = AtomQuery.make(queryResult);

    // Initialize the atom by getting its value first.
    const initialResults = registry.get(atom);
    expect(initialResults).toHaveLength(1);

    // Subscribe to atom updates.
    let updateCount = 0;
    const unsubscribe = registry.subscribe(atom, () => {
      updateCount++;
    });

    // Add object and verify subscription fires.
    db.add(Obj.make(Type.Expando, { name: 'Object 2', value: 400 }));
    await db.flush({ indexes: true, updates: true });
    const countAfterFirstAdd = updateCount;
    expect(countAfterFirstAdd).toBeGreaterThan(0);

    // Unsubscribe.
    unsubscribe();

    // Add another object.
    db.add(Obj.make(Type.Expando, { name: 'Object 3', value: 400 }));
    await db.flush({ indexes: true, updates: true });

    // Update count should not have changed after unsubscribe.
    expect(updateCount).toBe(countAfterFirstAdd);
  });

  test('works with empty query results', async () => {
    const queryResult = db.query(Query.select(Filter.type(Type.Expando, { value: 999 })));
    await queryResult.run();

    const atom = AtomQuery.make(queryResult);
    const results = registry.get(atom);

    expect(results).toHaveLength(0);
  });

  test('multiple atoms from same query share underlying subscription', async () => {
    db.add(Obj.make(Type.Expando, { name: 'Object', value: 500 }));
    await db.flush({ indexes: true });

    const queryResult = db.query(Query.select(Filter.type(Type.Expando, { value: 500 })));
    await queryResult.run();

    // Create two atoms from the same query result.
    const atom1 = AtomQuery.make(queryResult);
    const atom2 = AtomQuery.make(queryResult);

    // Both should return the same results.
    const results1 = registry.get(atom1);
    const results2 = registry.get(atom2);

    expect(results1).toHaveLength(1);
    expect(results2).toHaveLength(1);
    expect(results1[0].name).toBe('Object');
    expect(results2[0].name).toBe('Object');
  });
});
