//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Schema from 'effect/Schema';
import * as TestClock from 'effect/TestClock';
import { describe, expect, test } from 'vitest';

import { Database, Filter, Key, Obj, Query } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import * as Operation from '@dxos/operation';
import { openAndClose } from '@dxos/test-utils';

import {
  Add,
  Compute,
  SideEffect,
  ToString,
  addHandler,
  computeHandler,
  createEventCollector,
  sideEffectHandler,
  toStringHandler,
} from '../testing';

import { NoHandlerError } from './errors';
import * as FollowupScheduler from './followup-scheduler';
import * as OperationInvoker from './operation-invoker';
import * as OperationResolver from './operation-resolver';

describe('OperationInvoker', () => {
  it.effect('throws error if no handler found', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([]));
      const result = yield* invoker.invoke(Compute, { value: 1 }).pipe(Effect.either);

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(NoHandlerError);
      }
    }),
  );

  it.effect('matches operation to handler and executes', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([toStringHandler]));
      const result = yield* invoker.invoke(ToString, { value: 42 });

      expect(result.string).toBe('42');
    }),
  );

  it.effect('update handlers dynamically', () =>
    Effect.gen(function* () {
      const handlers: OperationResolver.OperationResolver[] = [];
      const invoker = OperationInvoker.make(() => Effect.succeed(handlers));

      // No handler registered.
      const error1 = yield* invoker.invoke(ToString, { value: 1 }).pipe(Effect.either);
      expect(error1._tag).toBe('Left');

      // Add handler.
      handlers.push(toStringHandler);
      const result = yield* invoker.invoke(ToString, { value: 1 });
      expect(result.string).toBe('1');

      // Remove handler.
      handlers.splice(handlers.indexOf(toStringHandler), 1);
      const error2 = yield* invoker.invoke(ToString, { value: 1 }).pipe(Effect.either);
      expect(error2._tag).toBe('Left');
    }),
  );

  it.effect('compose operation effects', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([computeHandler]));

      // Fork both operations.
      const fiberA = yield* Effect.fork(invoker.invoke(Compute, { value: 1 }));
      // Advance clock for first operation (1 * 10ms).
      yield* TestClock.adjust('10 millis');
      const a = yield* Fiber.join(fiberA);

      const fiberB = yield* Effect.fork(invoker.invoke(Compute, { value: 2 }));
      // Advance clock for second operation (2 * 10ms).
      yield* TestClock.adjust('20 millis');
      const b = yield* Fiber.join(fiberB);

      expect(b.value - a.value).toBe(2);
    }),
  );

  it.effect('concurrent operation effects', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([computeHandler]));

      // Fork both operations concurrently.
      const fiberA = yield* Effect.fork(invoker.invoke(Compute, { value: 5 }));
      const fiberB = yield* Effect.fork(invoker.invoke(Compute, { value: 2 }));

      // Advance clock enough for both (max is 5 * 10ms = 50ms).
      yield* TestClock.adjust('50 millis');

      const [a, b] = yield* Fiber.join(Fiber.zip(fiberA, fiberB));
      expect(b.value - a.value).toBe(-6);
    }),
  );

  it.effect('mix & match effect and promise APIs', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([toStringHandler, computeHandler]));

      // Fork the compute operation and advance clock.
      const fiberA = yield* Effect.fork(invoker.invoke(Compute, { value: 2 }));
      yield* TestClock.adjust('20 millis');
      const a = yield* Fiber.join(fiberA);

      const b = yield* invoker.invoke(ToString, { value: a.value });
      expect(b.string).toBe('4');

      // Promise API still works (tested separately with live clock due to Promise semantics).
    }),
  );

  it.effect('filter handlers by predicate', () =>
    Effect.gen(function* () {
      const conditionalHandler: OperationResolver.OperationResolver = {
        operation: Compute,
        filter: (data: { value: number }) => data?.value > 1,
        handler: (data: { value: number }) => Effect.succeed({ value: data.value * 3 }),
      };
      const invoker = OperationInvoker.make(() => Effect.succeed([conditionalHandler, computeHandler]));

      // value=1 should use computeHandler (multiplies by 2, has sleep).
      const fiberA = yield* Effect.fork(invoker.invoke(Compute, { value: 1 }));
      yield* TestClock.adjust('10 millis');
      const a = yield* Fiber.join(fiberA);
      expect(a.value).toBe(2);

      // value=2 should use conditionalHandler (multiplies by 3, no sleep).
      const b = yield* invoker.invoke(Compute, { value: 2 });
      expect(b.value).toBe(6);
    }),
  );

  it.effect('hoist handlers', () =>
    Effect.gen(function* () {
      const hoistedHandler: OperationResolver.OperationResolver = {
        operation: Compute,
        position: 'hoist',
        handler: (data: { value: number }) => Effect.succeed({ value: data.value * 3 }),
      };
      const invoker = OperationInvoker.make(() => Effect.succeed([computeHandler, hoistedHandler]));
      const result = yield* invoker.invoke(Compute, { value: 1 });

      expect(result.value).toBe(3);
    }),
  );

  it.effect('fallback handlers', () =>
    Effect.gen(function* () {
      const conditionalHandler: OperationResolver.OperationResolver = {
        operation: Compute,
        filter: (data: { value: number }) => data?.value === 1,
        handler: (data: { value: number }) => Effect.succeed({ value: data.value * 2 }),
      };
      const fallbackHandler: OperationResolver.OperationResolver = {
        operation: Compute,
        position: 'fallback',
        handler: (data: { value: number }) => Effect.succeed({ value: data.value * 3 }),
      };
      const invoker = OperationInvoker.make(() => Effect.succeed([conditionalHandler, fallbackHandler]));

      const a = yield* invoker.invoke(Compute, { value: 1 });
      expect(a.value).toBe(2);

      const b = yield* invoker.invoke(Compute, { value: 2 });
      expect(b.value).toBe(6);
    }),
  );

  it.effect('non-struct inputs & outputs', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([addHandler]));
      const result = yield* invoker.invoke(Add, [1, 1]);

      expect(result).toBe(2);
    }),
  );

  it.effect('empty inputs & outputs', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([sideEffectHandler]));
      const result = yield* invoker.invoke(SideEffect, undefined);

      expect(result).toBe(undefined);
    }),
  );

  it.effect('handler can invoke another operation sequentially', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([computeAndStringifyHandler, toStringHandler]));

      // Handler that computes and then converts result to string.
      const computeAndStringifyHandler: OperationResolver.OperationResolver = {
        operation: Compute,
        handler: (data: { value: number }) =>
          Effect.gen(function* () {
            const doubled = data.value * 2;
            // Invoke ToString operation and wait for result (no sleep in toString).
            const stringResult = yield* invoker.invoke(ToString, { value: doubled });
            return { value: doubled, stringified: stringResult.string };
          }),
      };

      const collector = yield* createEventCollector(invoker);

      const result = yield* invoker.invoke(Compute, { value: 5 });

      // Wait for both events to be collected.
      yield* collector.waitForEvents(2);

      // Compute result: 5 * 2 = 10.
      expect(result.value).toBe(10);
      expect((result as any).stringified).toBe('10');

      // Both operations should emit events.
      expect(collector.events.length).toBe(2);
      expect(collector.events[0].operation.meta.key).toBe('test.to-string');
      expect(collector.events[1].operation.meta.key).toBe('test.compute');

      yield* collector.dispose;
    }),
  );

  it.effect('handler can fork another operation (fire-and-forget)', () =>
    Effect.gen(function* () {
      let sideEffectExecuted = false;
      const trackingSideEffectHandler: OperationResolver.OperationResolver = {
        operation: SideEffect,
        handler: () =>
          Effect.sync(() => {
            sideEffectExecuted = true;
            return undefined;
          }),
      };

      const invoker = OperationInvoker.make(() =>
        Effect.succeed([computeWithForkedSideEffect, trackingSideEffectHandler]),
      );

      // Handler that forks a side effect and returns immediately.
      const computeWithForkedSideEffect: OperationResolver.OperationResolver = {
        operation: Compute,
        handler: (data: { value: number }) =>
          Effect.gen(function* () {
            // Fork the side effect to run independently.
            yield* Effect.fork(invoker.invoke(SideEffect, undefined));
            return { value: data.value * 2 };
          }),
      };

      const collector = yield* createEventCollector(invoker);

      // Side effect not executed yet.
      expect(sideEffectExecuted).toBe(false);

      const result = yield* invoker.invoke(Compute, { value: 3 });

      // Compute returns immediately.
      expect(result.value).toBe(6);

      // Wait for both events (compute + side effect).
      yield* collector.waitForEvents(2);

      // Now side effect should be executed.
      expect(sideEffectExecuted).toBe(true);

      // Both operations should emit events.
      expect(collector.events.length).toBe(2);
      expect(collector.events.map((e) => e.operation.meta.key)).toContain('test.compute');
      expect(collector.events.map((e) => e.operation.meta.key)).toContain('test.side-effect');

      yield* collector.dispose;
    }),
  );

  it.effect('emits invocation events via stream', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([toStringHandler]));
      const collector = yield* createEventCollector(invoker);

      yield* invoker.invoke(ToString, { value: 42 });
      yield* invoker.invoke(ToString, { value: 100 });

      // Wait for both events.
      yield* collector.waitForEvents(2);

      expect(collector.events.length).toBe(2);
      expect(collector.events[0].operation.meta.key).toBe('test.to-string');
      expect(collector.events[0].input.value).toBe(42);
      expect(collector.events[0].output.string).toBe('42');
      expect(collector.events[1].input.value).toBe(100);

      yield* collector.dispose;
    }),
  );

  it.effect('_invokeCore does not emit events', () =>
    Effect.gen(function* () {
      const invoker = OperationInvoker.make(() => Effect.succeed([toStringHandler]));
      const collector = yield* createEventCollector(invoker);

      // Regular invoke emits.
      yield* invoker.invoke(ToString, { value: 1 });
      yield* collector.waitForEvents(1);
      expect(collector.events.length).toBe(1);

      // Internal invoke does not emit.
      yield* invoker._invokeCore(ToString, { value: 2 });

      // The event count should still be 1 (no new events).
      expect(collector.events.length).toBe(1);

      yield* collector.dispose;
    }),
  );

  it('synchronous handler can be run with Effect.runSync', ({ expect }) => {
    let executed = false;
    const syncHandler: OperationResolver.OperationResolver = {
      operation: SideEffect,
      handler: () =>
        Effect.sync(() => {
          executed = true;
          return undefined;
        }),
    };
    const invoker = OperationInvoker.make(() => Effect.succeed([syncHandler]));

    // Effect.runSync throws if the effect requires async execution.
    // This verifies the invoker doesn't introduce unnecessary async boundaries.
    Effect.runSync(invoker.invoke(SideEffect, undefined));

    expect(executed).toBe(true);
  });

  it('asynchronous handler throws when run with Effect.runSync', ({ expect }) => {
    const asyncHandler: OperationResolver.OperationResolver = {
      operation: Compute,
      handler: (data: { value: number }) =>
        Effect.gen(function* () {
          yield* Effect.sleep(10);
          return { value: data.value * 2 };
        }),
    };
    const invoker = OperationInvoker.make(() => Effect.succeed([asyncHandler]));

    // Effect.runSync should throw when the handler requires async execution.
    expect(() => Effect.runSync(invoker.invoke(Compute, { value: 1 }))).toThrow();
  });
});

//
// Service-based operation tests.
//

// Test service definitions.
class DatabaseService extends Context.Tag('@test/DatabaseService')<
  DatabaseService,
  { query: (id: string) => string }
>() {}
class ConfigService extends Context.Tag('@test/ConfigService')<ConfigService, { get: (key: string) => string }>() {}

// Operation that requires a service.
const FetchData = Operation.make({
  schema: {
    input: Schema.Struct({ id: Schema.String }),
    output: Schema.Struct({ data: Schema.String }),
  },
  meta: { key: 'test.fetch-data' },
  services: [DatabaseService],
});

// Operation that requires multiple services.
const FetchWithConfig = Operation.make({
  schema: {
    input: Schema.Struct({ id: Schema.String }),
    output: Schema.Struct({ data: Schema.String, prefix: Schema.String }),
  },
  meta: { key: 'test.fetch-with-config' },
  services: [DatabaseService, ConfigService],
});

describe('OperationInvoker with ManagedRuntime services', () => {
  test('handler can access service from ManagedRuntime', async ({ expect }) => {
    // Create layers for our services.
    const databaseLayer = Layer.succeed(DatabaseService, {
      query: (id: string) => `data-for-${id}`,
    });

    // Create managed runtime with the service.
    const runtime = ManagedRuntime.make(databaseLayer);

    // Handler that uses the service.
    const fetchHandler = OperationResolver.make({
      operation: FetchData,
      handler: (input) =>
        Effect.gen(function* () {
          const db = yield* DatabaseService;
          return { data: db.query(input.id) };
        }),
    });

    const invoker = OperationInvoker.make(() => Effect.succeed([fetchHandler]), runtime);

    const result = await invoker.invokePromise(FetchData, { id: '123' });

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({ data: 'data-for-123' });

    await runtime.dispose();
  });

  test('handler can access multiple services from ManagedRuntime', async ({ expect }) => {
    // Create layers for both services.
    const databaseLayer = Layer.succeed(DatabaseService, {
      query: (id: string) => `record-${id}`,
    });
    const configLayer = Layer.succeed(ConfigService, {
      get: (key: string) => `config:${key}`,
    });

    // Merge layers.
    const combinedLayer = Layer.mergeAll(databaseLayer, configLayer);
    const runtime = ManagedRuntime.make(combinedLayer);

    // Handler that uses both services.
    const fetchWithConfigHandler = OperationResolver.make({
      operation: FetchWithConfig,
      handler: (input) =>
        Effect.gen(function* () {
          const db = yield* DatabaseService;
          const config = yield* ConfigService;
          return {
            data: db.query(input.id),
            prefix: config.get('prefix'),
          };
        }),
    });

    const invoker = OperationInvoker.make(() => Effect.succeed([fetchWithConfigHandler]), runtime);

    const result = await invoker.invokePromise(FetchWithConfig, { id: 'abc' });

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({
      data: 'record-abc',
      prefix: 'config:prefix',
    });

    await runtime.dispose();
  });

  test('handler fails when required service is missing from ManagedRuntime', async ({ expect }) => {
    // Create runtime WITHOUT the required service.
    const runtime = ManagedRuntime.make(Layer.empty) as unknown as ManagedRuntime.ManagedRuntime<any, any>;

    // Handler that tries to use the service.
    const fetchHandler = OperationResolver.make({
      operation: FetchData,
      handler: (input) =>
        Effect.gen(function* () {
          const db = yield* DatabaseService;
          return { data: db.query(input.id) };
        }),
    });

    const invoker = OperationInvoker.make(() => Effect.succeed([fetchHandler]), runtime);

    const result = await invoker.invokePromise(FetchData, { id: '123' });

    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('Missing required tags');
    expect(result.error?.message).toContain('@test/DatabaseService');

    await runtime.dispose();
  });

  test('operation without services runs without ManagedRuntime', async ({ expect }) => {
    // Use an operation without declared services.
    const invoker = OperationInvoker.make(() => Effect.succeed([toStringHandler]));

    // Should work fine without a ManagedRuntime.
    const result = await invoker.invokePromise(ToString, { value: 42 });

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({ string: '42' });
  });

  test('operation with services but no ManagedRuntime runs handler directly', async ({ expect }) => {
    // Handler that doesn't actually use the service (just returns a value).
    const fetchHandler: OperationResolver.OperationResolver = {
      operation: FetchData,
      handler: (_input: { id: string }) => Effect.succeed({ data: 'static-data' }),
    };

    // Create invoker without ManagedRuntime.
    const invoker = OperationInvoker.make(() => Effect.succeed([fetchHandler]));

    // The handler runs directly (no service provision), which works if handler doesn't use services.
    const result = await invoker.invokePromise(FetchData, { id: '123' });

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({ data: 'static-data' });
  });
});

//
// DatabaseResolver tests for per-invocation context.
//

// Mock "Database" service to simulate @dxos/echo Database.Service.
class MockDatabaseService extends Context.Tag('@test/MockDatabaseService')<
  MockDatabaseService,
  { getRecord: (id: string) => string; spaceId: string }
>() {}

// Operation that uses the mock database service.
const QueryDatabase = Operation.make({
  schema: {
    input: Schema.Struct({ recordId: Schema.String }),
    output: Schema.Struct({ record: Schema.String, fromSpace: Schema.String }),
  },
  meta: { key: 'test.query-database' },
  services: [MockDatabaseService],
});

describe('OperationInvoker with DatabaseResolver', () => {
  test('handler can access database service provided via spaceId option', async ({ expect }) => {
    // Simulate databases for different spaces.
    const databases: Record<string, { getRecord: (id: string) => string; spaceId: string }> = {
      'space-1': { getRecord: (id) => `space1-record-${id}`, spaceId: 'space-1' },
      'space-2': { getRecord: (id) => `space2-record-${id}`, spaceId: 'space-2' },
    };

    // Database resolver that looks up the database by spaceId.
    const databaseResolver: OperationInvoker.DatabaseResolver = (spaceId) =>
      Effect.gen(function* () {
        const db = databases[spaceId];
        if (!db) {
          return yield* Effect.fail(new Error(`Space not found: ${spaceId}`));
        }
        return Context.make(MockDatabaseService, db);
      });

    // Handler that uses the database service.
    const queryHandler = OperationResolver.make({
      operation: QueryDatabase,
      handler: (input: { recordId: string }) =>
        Effect.gen(function* () {
          const db = yield* MockDatabaseService;
          return {
            record: db.getRecord(input.recordId),
            fromSpace: db.spaceId,
          };
        }),
    });

    const invoker = OperationInvoker.make(
      () => Effect.succeed([queryHandler]),
      undefined, // No ManagedRuntime needed for this test.
      databaseResolver,
    );

    // Invoke with spaceId in options - should use space-1's database.
    const result1 = await invoker.invokePromise(QueryDatabase, { recordId: 'abc' }, { spaceId: 'space-1' as any });
    expect(result1.error).toBeUndefined();
    expect(result1.data).toEqual({ record: 'space1-record-abc', fromSpace: 'space-1' });

    // Invoke with different spaceId - should use space-2's database.
    const result2 = await invoker.invokePromise(QueryDatabase, { recordId: 'xyz' }, { spaceId: 'space-2' as any });
    expect(result2.error).toBeUndefined();
    expect(result2.data).toEqual({ record: 'space2-record-xyz', fromSpace: 'space-2' });
  });

  test('handler fails when spaceId is invalid', async ({ expect }) => {
    const databaseResolver: OperationInvoker.DatabaseResolver = (spaceId) =>
      Effect.fail(new Error(`Space not found: ${spaceId}`));

    const queryHandler = OperationResolver.make({
      operation: QueryDatabase,
      handler: (input: { recordId: string }) =>
        Effect.gen(function* () {
          const db = yield* MockDatabaseService;
          return { record: db.getRecord(input.recordId), fromSpace: db.spaceId };
        }),
    });

    const invoker = OperationInvoker.make(() => Effect.succeed([queryHandler]), undefined, databaseResolver);

    const result = await invoker.invokePromise(
      QueryDatabase,
      { recordId: 'test' },
      { spaceId: 'invalid-space' as any },
    );
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('Space not found');
  });

  test('handler works without spaceId when database service not needed', async ({ expect }) => {
    // Handler that doesn't use the database service.
    const simpleHandler: OperationResolver.OperationResolver = {
      operation: QueryDatabase,
      handler: (input: { recordId: string }) =>
        Effect.succeed({ record: `simple-${input.recordId}`, fromSpace: 'none' }),
    };

    const invoker = OperationInvoker.make(() => Effect.succeed([simpleHandler]));

    // Invoke without spaceId option.
    const result = await invoker.invokePromise(QueryDatabase, { recordId: 'test' });
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({ record: 'simple-test', fromSpace: 'none' });
  });

  test('databaseResolver is not called when spaceId is not provided', async ({ expect }) => {
    let resolverCalled = false;
    const databaseResolver: OperationInvoker.DatabaseResolver = (_spaceId) => {
      resolverCalled = true;
      return Effect.fail(new Error('Should not be called'));
    };

    const simpleHandler: OperationResolver.OperationResolver = {
      operation: QueryDatabase,
      handler: (input: { recordId: string }) =>
        Effect.succeed({ record: `result-${input.recordId}`, fromSpace: 'n/a' }),
    };

    const invoker = OperationInvoker.make(() => Effect.succeed([simpleHandler]), undefined, databaseResolver);

    // Invoke without spaceId option.
    const result = await invoker.invokePromise(QueryDatabase, { recordId: 'foo' });
    expect(result.error).toBeUndefined();
    expect(resolverCalled).toBe(false);
  });
});

//
// Tests with real Database.Service from echo-db.
//

// Operation that counts objects in a database.
const CountObjects = Operation.make({
  schema: {
    input: Schema.Struct({}),
    output: Schema.Struct({ count: Schema.Number }),
  },
  meta: { key: 'test.count-objects' },
  services: [Database.Service],
});

// Operation that creates an object in the database.
const CreateObject = Operation.make({
  schema: {
    input: Schema.Struct({ name: Schema.String }),
    output: Schema.Struct({ id: Schema.String, name: Schema.String }),
  },
  meta: { key: 'test.create-object' },
  services: [Database.Service],
});

describe('OperationInvoker with real Database.Service', () => {
  test('handler can access real Database.Service via spaceId option', async ({ expect }) => {
    // Generate real space IDs.
    const spaceId1 = Key.SpaceId.random();
    const spaceId2 = Key.SpaceId.random();

    // Create builder and databases using same pattern as echo-db tests.
    const builder = new EchoTestBuilder();
    await openAndClose(builder);
    const { db: db1, graph: graph1 } = await builder.createDatabase();
    const { db: db2, graph: graph2 } = await builder.createDatabase();

    await graph1.schemaRegistry.register([TestSchema.Task]);
    await graph2.schemaRegistry.register([TestSchema.Task]);
    db1.add(Obj.make(TestSchema.Task, { title: 'Task 1' }));
    db1.add(Obj.make(TestSchema.Task, { title: 'Task 2' }));
    db2.add(Obj.make(TestSchema.Task, { title: 'Task 3' }));
    await db1.flush();
    await db2.flush();

    // Database resolver that maps spaceId to the actual database.
    const databasesBySpaceId = new Map([
      [spaceId1, db1],
      [spaceId2, db2],
    ]);

    const databaseResolver: OperationInvoker.DatabaseResolver = (spaceId) =>
      Effect.gen(function* () {
        const db = databasesBySpaceId.get(spaceId);
        if (!db) {
          return yield* Effect.fail(new Error(`Space not found: ${spaceId}`));
        }
        return Context.make(Database.Service, Database.Service.make(db));
      });

    // Handler that counts objects using Database.Service.runQuery.
    const countHandler = OperationResolver.make({
      operation: CountObjects,
      handler: (_input) =>
        Effect.gen(function* () {
          const objects = yield* Database.Service.runQuery(Filter.everything());
          return { count: objects.length };
        }),
    });

    const invoker = OperationInvoker.make(() => Effect.succeed([countHandler]), undefined, databaseResolver);

    // Query first database - should find 2 objects.
    const result1 = await invoker.invokePromise(CountObjects, {}, { spaceId: spaceId1 });
    expect(result1.error).toBeUndefined();
    expect(result1.data?.count).toBe(2);

    // Query second database - should find 1 object.
    const result2 = await invoker.invokePromise(CountObjects, {}, { spaceId: spaceId2 });
    expect(result2.error).toBeUndefined();
    expect(result2.data?.count).toBe(1);
  });

  test('handler can create objects using Database.Service', async ({ expect }) => {
    const spaceId = Key.SpaceId.random();

    const builder = new EchoTestBuilder();
    await openAndClose(builder);
    const { db, graph } = await builder.createDatabase();
    await graph.schemaRegistry.register([TestSchema.Task]);

    const databaseResolver: OperationInvoker.DatabaseResolver = (requestedSpaceId) =>
      Effect.gen(function* () {
        if (requestedSpaceId !== spaceId) {
          return yield* Effect.fail(new Error(`Space not found: ${requestedSpaceId}`));
        }
        return Context.make(Database.Service, Database.Service.make(db));
      });

    // Handler that creates an object in the database.
    const createHandler = OperationResolver.make({
      operation: CreateObject,
      handler: (input) =>
        Effect.gen(function* () {
          const obj = yield* Database.Service.add(Obj.make(TestSchema.Task, { title: input.name }));
          return { id: obj.id, name: input.name };
        }),
    });

    const invoker = OperationInvoker.make(() => Effect.succeed([createHandler]), undefined, databaseResolver);

    // Initially no objects.
    const initialObjects = await db.query(Query.select(Filter.type(TestSchema.Task))).run();
    expect(initialObjects.length).toBe(0);

    // Create an object via operation.
    const result = await invoker.invokePromise(CreateObject, { name: 'TestObject' }, { spaceId });
    expect(result.error).toBeUndefined();
    expect(result.data?.name).toBe('TestObject');

    // Verify object was created.
    const finalObjects = await db.query(Query.select(Filter.type(TestSchema.Task))).run();
    expect(finalObjects.length).toBe(1);
    expect(finalObjects[0].title).toBe('TestObject');
  });
});

//
// Type-level tests for OperationResolver.make service constraints.
//

describe('OperationResolver.make type safety', () => {
  test('handler using undeclared service is a type error', () => {
    class DeclaredService extends Context.Tag('@test/DeclaredService')<DeclaredService, { declared: () => void }>() {}
    class UndeclaredService extends Context.Tag('@test/UndeclaredService')<
      UndeclaredService,
      { undeclared: () => void }
    >() {}

    const opWithDeclaredService = Operation.make({
      schema: {
        input: Schema.Void,
        output: Schema.Void,
      },
      meta: { key: 'test.declared-service' },
      services: [DeclaredService],
    });

    // Using the declared service is allowed.
    OperationResolver.make({
      operation: opWithDeclaredService,
      handler: (_input) =>
        Effect.gen(function* () {
          yield* DeclaredService;
        }),
    });

    // Using an undeclared service should be a type error.
    OperationResolver.make({
      operation: opWithDeclaredService,
      handler: (_input) =>
        // @ts-expect-error - UndeclaredService is not in the operation's services
        Effect.gen(function* () {
          yield* UndeclaredService;
        }),
    });

    // Using FollowupScheduler.Service is always allowed (provided by invoker).
    OperationResolver.make({
      operation: opWithDeclaredService,
      handler: (_input) =>
        Effect.gen(function* () {
          const scheduler = yield* FollowupScheduler.Service;
          void scheduler;
        }),
    });
  });
});
