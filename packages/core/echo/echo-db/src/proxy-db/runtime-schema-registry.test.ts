//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Type } from '@dxos/echo';

import { RuntimeSchemaRegistry } from './runtime-schema-registry';

const TestSchemaA = Schema.Struct({
  name: Schema.String,
}).pipe(
  Type.object({
    typename: 'com.example.type.a',
    version: '0.1.0',
  }),
);

const TestSchemaB = Schema.Struct({
  value: Schema.Number,
}).pipe(
  Type.object({
    typename: 'com.example.type.b',
    version: '0.1.0',
  }),
);

describe('RuntimeSchemaRegistry', () => {
  let registry: RuntimeSchemaRegistry;

  beforeEach(() => {
    registry = new RuntimeSchemaRegistry([]);
  });

  test('register adds schemas to the registry', async ({ expect }) => {
    await registry.register([TestSchemaA]);
    expect(registry.schemas).toHaveLength(1);
    expect(Type.getTypename(registry.schemas[0])).toBe('com.example.type.a');
  });

  test('query returns registered schemas', async ({ expect }) => {
    await registry.register([TestSchemaA]);
    const results = registry.query().runSync();
    expect(results).toHaveLength(1);
    expect(Type.getTypename(results[0])).toBe('com.example.type.a');
  });

  test('query filters by typename', async ({ expect }) => {
    await registry.register([TestSchemaA, TestSchemaB]);
    const results = registry.query({ typename: 'com.example.type.a' }).runSync();
    expect(results).toHaveLength(1);
    expect(Type.getTypename(results[0])).toBe('com.example.type.a');
  });

  test('reactive query fires on register', async ({ expect }) => {
    const queryResult = registry.query();

    let updateCount = 0;
    const unsubscribe = queryResult.subscribe(() => {
      updateCount++;
    });

    // Allow the reactive query to start (deferred via queueMicrotask).
    await sleep(10);

    await registry.register([TestSchemaA]);

    expect(updateCount).toBeGreaterThan(0);
    expect(queryResult.results).toHaveLength(1);
    expect(Type.getTypename(queryResult.results[0])).toBe('com.example.type.a');

    unsubscribe();
  });

  test('reactive query updates with newly registered schemas', async ({ expect }) => {
    await registry.register([TestSchemaA]);

    const queryResult = registry.query();
    let latestResults: Type.AnyEntity[] = [];
    const unsubscribe = queryResult.subscribe(() => {
      latestResults = queryResult.results;
    });

    // Allow the reactive query to start.
    await sleep(10);

    await registry.register([TestSchemaB]);

    expect(latestResults).toHaveLength(2);
    expect(latestResults.map(Type.getTypename).sort()).toEqual(['com.example.type.a', 'com.example.type.b']);

    unsubscribe();
  });

  test('reactive query stops receiving updates after unsubscribe', async ({ expect }) => {
    const queryResult = registry.query();

    let updateCount = 0;
    const unsubscribe = queryResult.subscribe(() => {
      updateCount++;
    });

    await sleep(10);

    await registry.register([TestSchemaA]);
    const countAfterFirst = updateCount;
    expect(countAfterFirst).toBeGreaterThan(0);

    unsubscribe();

    await registry.register([TestSchemaB]);

    expect(updateCount).toBe(countAfterFirst);
  });

  test('filtered reactive query only fires for matching schemas', async ({ expect }) => {
    const queryResult = registry.query({ typename: 'com.example.type.a' });

    let latestResults: Type.AnyEntity[] = [];
    let updateCount = 0;
    const unsubscribe = queryResult.subscribe(() => {
      updateCount++;
      latestResults = queryResult.results;
    });

    await sleep(10);

    // Register a non-matching schema.
    await registry.register([TestSchemaB]);
    // The query fires (the event is emitted) but results should be empty.
    expect(latestResults).toHaveLength(0);

    // Register a matching schema.
    await registry.register([TestSchemaA]);
    expect(latestResults).toHaveLength(1);
    expect(Type.getTypename(latestResults[0])).toBe('com.example.type.a');

    unsubscribe();
  });

  test('runSync works without subscription', async ({ expect }) => {
    await registry.register([TestSchemaA]);
    const results = registry.query().runSync();
    expect(results).toHaveLength(1);
  });

  test('run works without subscription', async ({ expect }) => {
    await registry.register([TestSchemaA]);
    const results = await registry.query().run();
    expect(results).toHaveLength(1);
  });
});
