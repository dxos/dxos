//
// Copyright 2026 DXOS.org
//

import * as KeyValueStore from '@effect/platform/KeyValueStore';
import { describe, it } from '@effect/vitest';
import * as Chunk from 'effect/Chunk';
import * as Context from 'effect/Context';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import { Database, Obj, Query } from '@dxos/echo';
import { TracingService } from '@dxos/functions';
import { ObjectId } from '@dxos/keys';
import { Operation, OperationHandlerSet } from '@dxos/operation';
import { Organization } from '@dxos/types';

import { ServiceNotAvailableError } from '../errors';
import { TestDatabaseLayer } from '../testing';
import * as Process from './Process';
import * as ProcessManager from './ProcessManager';
import * as ProcessOperationInvoker from './ProcessOperationInvoker';
import * as ServiceResolver from './ServiceResolver';
import * as StorageService from './StorageService';

//
// Test services (for unit tests without full ECHO stack).
//

class DatabaseService extends Context.Tag('@test/DatabaseService')<
  DatabaseService,
  {
    query(sql: string): Effect.Effect<readonly string[]>;
    execute(sql: string): Effect.Effect<void>;
  }
>() {}

const makeInMemoryDatabase = () => {
  const rows: string[] = [];
  return {
    service: {
      query: (sql: string) => Effect.sync(() => rows.filter((row) => row.includes(sql))),
      execute: (sql: string) =>
        Effect.sync(() => {
          rows.push(sql);
        }),
    } satisfies Context.Tag.Service<DatabaseService>,
    rows,
  };
};

//
// Operation definitions.
//

const Double = Operation.make({
  meta: { key: 'test/double', name: 'Double' },
  input: Schema.Struct({ value: Schema.Number }),
  output: Schema.Number,
});

const DoubleHandler = Operation.withHandler(
  Double,
  Effect.fn(function* ({ value }) {
    return value * 2;
  }),
);

const Echo = Operation.make({
  meta: { key: 'test/echo', name: 'Echo' },
  input: Schema.String,
  output: Schema.String,
});

const EchoHandler = Operation.withHandler(
  Echo,
  Effect.fn(function* (input) {
    return `echo: ${input}`;
  }),
);

const InsertRow = Operation.make({
  meta: { key: 'test/insert-row', name: 'InsertRow' },
  input: Schema.String,
  output: Schema.String,
  services: [DatabaseService],
});

const InsertRowHandler = Operation.withHandler(
  InsertRow,
  Effect.fn(function* (input) {
    const db = yield* DatabaseService;
    yield* db.execute(input);
    return `inserted: ${input}`;
  }),
);

const QueryRows = Operation.make({
  meta: { key: 'test/query-rows', name: 'QueryRows' },
  input: Schema.String,
  output: Schema.Array(Schema.String),
  services: [DatabaseService],
});

const QueryRowsHandler = Operation.withHandler(
  QueryRows,
  Effect.fn(function* (input) {
    const db = yield* DatabaseService;
    return yield* db.query(input);
  }),
);

const CreateOrg = Operation.make({
  meta: { key: 'org.example.create-organization', name: 'CreateOrganization' },
  input: Schema.String,
  output: Schema.String,
  services: [Database.Service],
});

const QueryOrgs = Operation.make({
  meta: { key: 'org.example.query-organizations', name: 'QueryOrganizations' },
  input: Schema.Void,
  output: Schema.Array(Organization.Organization),
  services: [Database.Service],
});

const handlers = OperationHandlerSet.make(
  DoubleHandler,
  Operation.withHandler(
    CreateOrg,
    Effect.fn(function* (input) {
      const org = yield* Database.add(Obj.make(Organization.Organization, { name: input }));
      return Obj.getDXN(org).toString();
    }),
  ),
  Operation.withHandler(
    QueryOrgs,
    Effect.fn(function* (_input) {
      return yield* Database.runQuery(Query.type(Organization.Organization));
    }),
  ),
);

//
// Executable factories.
//

const makeOperationExecutables = () => {
  const handlerSet = OperationHandlerSet.make(DoubleHandler, EchoHandler);
  return {
    double: Process.fromOperation(Double, handlerSet),
    echo: Process.fromOperation(Echo, handlerSet),
  };
};

const makeDbOperationExecutables = () => {
  const handlerSet = OperationHandlerSet.make(InsertRowHandler, QueryRowsHandler);
  return {
    insertRow: Process.fromOperation(InsertRow, handlerSet),
    queryRows: Process.fromOperation(QueryRows, handlerSet),
  };
};

const makeSimpleExecutable = () =>
  Process.makeExecutable(
    {
      input: Schema.Struct({ value: Schema.Number }),
      output: Schema.Number,
      services: [],
    },
    (ctx) =>
      Effect.succeed({
        init: () => Effect.void,
        handleInput: (input: { value: number }) =>
          Effect.sync(() => {
            ctx.submitOutput(input.value * 2);
            ctx.exit();
          }),
        alarm: () => Effect.void,
        childEvent: () => Effect.void,
      }),
  );

const makeStorageExecutable = () =>
  Process.makeExecutable(
    {
      input: Schema.Struct({ key: Schema.String, value: Schema.String }),
      output: Schema.String,
      services: [StorageService.StorageService],
    },
    (ctx) =>
      Effect.gen(function* () {
        const storage = yield* StorageService.StorageService;

        return {
          init: () => Effect.void,
          handleInput: (input: { key: string; value: string }) =>
            Effect.gen(function* () {
              yield* storage.set(Schema.String, input.key, input.value);
              const read = yield* storage.get(Schema.String, input.key);
              ctx.submitOutput(Option.getOrElse(read, () => 'NOT_FOUND'));
              ctx.exit();
            }),
          alarm: () => Effect.void,
          childEvent: () => Effect.void,
        };
      }),
  );

const TestLayer = ProcessOperationInvoker.layer.pipe(
  Layer.provideMerge(ProcessManager.layer),
  Layer.provide(ServiceResolver.layerRequirements(Database.Service)),
  Layer.provide(
    TestDatabaseLayer({
      types: [Organization.Organization],
    }),
  ),
  Layer.provide(KeyValueStore.layerMemory),
  Layer.provide(OperationHandlerSet.provide(handlers)),
  Layer.provide(TracingService.layerNoop),
);

describe('ProcessManagerImpl', () => {
  it.effect(
    'spawns a process and produces output',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.ProcessManagerService;

      const executable = Process.makeExecutable(
        { input: Schema.Struct({ value: Schema.Number }), output: Schema.Number, services: [] },
        (ctx) =>
          Effect.succeed({
            init: () => Effect.void,
            handleInput: ({ value }: { value: number }) =>
              Effect.sync(() => {
                ctx.submitOutput(value * 2);
                ctx.exit();
              }),
            alarm: () => Effect.void,
            childEvent: () => Effect.void,
          }),
      );

      const handle = yield* manager.spawn(executable);
      expect(handle.pid).toBeDefined();

      const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);

      yield* handle.submitInput({ value: 5 });

      const outputs = yield* Fiber.join(outputFiber);
      expect(Chunk.toReadonlyArray(outputs)).toEqual([10]);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'operation invoker spawns a process and produces output',
    Effect.fn(function* ({ expect }) {
      const result = yield* Operation.invoke(Double, { value: 5 });
      expect(result).toEqual(10);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'terminates a process',
    Effect.fn(function* ({ expect }) {
      const { manager } = yield* ProcessManager.ProcessManagerService;
      const executable = makeSimpleExecutable();

      const handle = yield* manager.spawn(executable);

      const status = yield* handle.status();
      expect(status.state).toEqual(Process.State.HYBERNATING);

      yield* handle.terminate();

      const terminatedStatus = yield* handle.status();
      expect(terminatedStatus.state).toEqual(Process.State.TERMINATED);
      expect(Option.isSome(terminatedStatus.exit)).toBe(true);
      expect(Option.isSome(terminatedStatus.completedAt)).toBe(true);
    }),
  );

  it.effect(
    'lists spawned processes',
    Effect.fn(function* ({ expect }) {
      const { manager } = yield* ProcessManager.ProcessManagerService;
      const executable = makeSimpleExecutable();

      const handle1 = yield* manager.spawn(executable);
      const handle2 = yield* manager.spawn(executable);

      const handles = yield* manager.list();
      expect(handles).toHaveLength(2);
      expect(handles.map((handle) => handle.pid)).toContain(handle1.pid);
      expect(handles.map((handle) => handle.pid)).toContain(handle2.pid);
    }),
  );

  it.effect(
    'attaches to an existing process',
    Effect.fn(function* ({ expect }) {
      const { manager } = yield* ProcessManager.ProcessManagerService;
      const executable = makeSimpleExecutable();

      const handle = yield* manager.spawn(executable);
      const attached = yield* manager.attach(handle.pid);
      expect(attached.pid).toEqual(handle.pid);

      const outputFiber = yield* Stream.runCollect(attached.subscribeOutputs()).pipe(Effect.fork);
      yield* attached.submitInput({ value: 7 });
      const outputs = yield* Fiber.join(outputFiber);
      expect(Chunk.toReadonlyArray(outputs)).toEqual([14]);
    }),
  );

  it.effect(
    'updates status atom on registry',
    Effect.fn(function* ({ expect }) {
      const { registry, manager } = yield* ProcessManager.ProcessManagerService;
      const executable = makeSimpleExecutable();

      const handle = yield* manager.spawn(executable);

      const initialStatus = registry.get(handle.statusAtom);
      expect(initialStatus.state).toEqual(Process.State.HYBERNATING);

      const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);
      yield* handle.submitInput({ value: 1 });
      yield* Fiber.join(outputFiber);

      const completedStatus = registry.get(handle.statusAtom);
      expect(completedStatus.state).toEqual(Process.State.COMPLETED);
    }),
  );

  it.effect(
    'works with operation executable',
    Effect.fn(function* ({ expect }) {
      const { manager } = yield* ProcessManager.ProcessManagerService;
      const { double } = makeOperationExecutables();

      const handle = yield* manager.spawn(double);

      const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);
      yield* handle.submitInput({ value: 21 });
      const outputs = yield* Fiber.join(outputFiber);
      expect(Chunk.toReadonlyArray(outputs)).toEqual([42]);

      const status = yield* handle.status();
      expect(status.state).toEqual(Process.State.COMPLETED);
    }),
  );

  it.effect(
    'spawns multiple independent processes',
    Effect.fn(function* ({ expect }) {
      const { manager } = yield* ProcessManager.ProcessManagerService;
      const { double, echo } = makeOperationExecutables();

      const doubleHandle = yield* manager.spawn(double);
      const echoHandle = yield* manager.spawn(echo);

      const doubleFiber = yield* Stream.runCollect(doubleHandle.subscribeOutputs()).pipe(Effect.fork);
      const echoFiber = yield* Stream.runCollect(echoHandle.subscribeOutputs()).pipe(Effect.fork);

      yield* doubleHandle.submitInput({ value: 5 });
      yield* echoHandle.submitInput('hello');

      const doubleOutput = yield* Fiber.join(doubleFiber);
      const echoOutput = yield* Fiber.join(echoFiber);

      expect(Chunk.toReadonlyArray(doubleOutput)).toEqual([10]);
      expect(Chunk.toReadonlyArray(echoOutput)).toEqual(['echo: hello']);
    }),
  );

  describe('storage', () => {
    it.effect(
      'provides scoped storage to processes',
      Effect.fn(function* ({ expect }) {
        const { kvStore, manager } = yield* ProcessManager.ProcessManagerService;
        const executable = makeStorageExecutable();

        const handle = yield* manager.spawn(executable);

        const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);
        yield* handle.submitInput({ key: 'greeting', value: 'hello' });
        const outputs = yield* Fiber.join(outputFiber);
        expect(Chunk.toReadonlyArray(outputs)).toEqual(['hello']);

        expect(yield* kvStore.size).toEqual(0);
      }),
    );

    it.effect(
      'isolates storage between processes',
      Effect.fn(function* ({ expect }) {
        const { kvStore, manager } = yield* ProcessManager.ProcessManagerService;
        const executable = makeStorageExecutable();

        const handle1 = yield* manager.spawn(executable);
        const handle2 = yield* manager.spawn(executable);

        const fiber1 = yield* Stream.runCollect(handle1.subscribeOutputs()).pipe(Effect.fork);
        const fiber2 = yield* Stream.runCollect(handle2.subscribeOutputs()).pipe(Effect.fork);

        yield* handle1.submitInput({ key: 'data', value: 'from-1' });
        yield* handle2.submitInput({ key: 'data', value: 'from-2' });

        yield* Fiber.join(fiber1);
        yield* Fiber.join(fiber2);

        expect(yield* kvStore.size).toEqual(0);
      }),
    );

    it.effect(
      'cleans up storage on process completion',
      Effect.fn(function* ({ expect }) {
        const { kvStore, manager } = yield* ProcessManager.ProcessManagerService;
        const executable = makeStorageExecutable();

        const handle = yield* manager.spawn(executable);

        const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);
        yield* handle.submitInput({ key: 'temp', value: 'data' });
        yield* Fiber.join(outputFiber);

        const status = yield* handle.status();
        expect(status.state).toEqual(Process.State.COMPLETED);
        expect(yield* kvStore.size).toEqual(0);
      }),
    );

    it.effect(
      'cleans up storage on process termination',
      Effect.fn(function* ({ expect }) {
        const { kvStore, manager } = yield* ProcessManager.ProcessManagerService;
        const storageWriter = Process.makeExecutable(
          {
            input: Schema.Struct({ key: Schema.String, value: Schema.String }),
            output: Schema.String,
            services: [StorageService.StorageService],
          },
          (_ctx) =>
            Effect.gen(function* () {
              const storage = yield* StorageService.StorageService;

              return {
                init: () => Effect.void,
                handleInput: (input: { key: string; value: string }) =>
                  Effect.gen(function* () {
                    yield* storage.set(Schema.String, input.key, input.value);
                  }),
                alarm: () => Effect.void,
                childEvent: () => Effect.void,
              };
            }),
        );

        const handle = yield* manager.spawn(storageWriter);
        yield* handle.submitInput({ key: 'persist', value: 'value1' });

        expect(yield* kvStore.size).toEqual(1);

        yield* handle.terminate();

        expect(yield* kvStore.size).toEqual(0);
        const status = yield* handle.status();
        expect(status.state).toEqual(Process.State.TERMINATED);
      }),
    );
  });

  describe('concurrent submitInput', () => {
    it.effect(
      'handles multiple concurrent inputs',
      Effect.fn(function* ({ expect }) {
        const { manager } = yield* ProcessManager.ProcessManagerService;
        const gate1 = yield* Deferred.make<void>();
        const gate2 = yield* Deferred.make<void>();
        const received1 = yield* Deferred.make<void>();
        const received2 = yield* Deferred.make<void>();

        let handlerIndex = 0;
        const gates = [
          { latch: gate1, received: received1 },
          { latch: gate2, received: received2 },
        ];

        const executable = Process.makeExecutable(
          { input: Schema.String, output: Schema.String, services: [] },
          (ctx) =>
            Effect.succeed({
              init: () => Effect.void,
              handleInput: (input: string) =>
                Effect.gen(function* () {
                  const gate = gates[handlerIndex++];
                  yield* Deferred.succeed(gate.received, undefined);
                  yield* gate.latch;
                  ctx.submitOutput(`processed: ${input}`);
                }),
              alarm: () => Effect.void,
              childEvent: () => Effect.void,
            }),
        );

        const handle = yield* manager.spawn(executable);
        const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);

        const submit1 = yield* handle.submitInput('a').pipe(Effect.fork);
        yield* received1;

        const submit2 = yield* handle.submitInput('b').pipe(Effect.fork);
        yield* received2;

        const midStatus = yield* handle.status();
        expect(midStatus.state).toEqual(Process.State.RUNNING);

        yield* Deferred.succeed(gate1, undefined);
        yield* Fiber.join(submit1);

        const stillRunning = yield* handle.status();
        expect(stillRunning.state).toEqual(Process.State.RUNNING);

        yield* Deferred.succeed(gate2, undefined);
        yield* Fiber.join(submit2);

        const hibStatus = yield* handle.status();
        expect(hibStatus.state).toEqual(Process.State.HYBERNATING);

        yield* handle.terminate();
        const outputs = yield* Fiber.join(outputFiber);
        expect(Chunk.toReadonlyArray(outputs)).toHaveLength(2);
      }),
    );

    it.effect(
      'exit completes when all concurrent handlers finish',
      Effect.fn(function* ({ expect }) {
        const { manager } = yield* ProcessManager.ProcessManagerService;
        const gate1 = yield* Deferred.make<void>();
        const gate2 = yield* Deferred.make<void>();
        const received1 = yield* Deferred.make<void>();
        const received2 = yield* Deferred.make<void>();

        let handlerIndex = 0;
        const gates = [
          { latch: gate1, received: received1 },
          { latch: gate2, received: received2 },
        ];

        const executable = Process.makeExecutable(
          { input: Schema.String, output: Schema.String, services: [] },
          (ctx) =>
            Effect.succeed({
              init: () => Effect.void,
              handleInput: (input: string) =>
                Effect.gen(function* () {
                  const gate = gates[handlerIndex++];
                  yield* Deferred.succeed(gate.received, undefined);
                  yield* gate.latch;
                  ctx.submitOutput(`processed: ${input}`);
                  ctx.exit();
                }),
              alarm: () => Effect.void,
              childEvent: () => Effect.void,
            }),
        );

        const handle = yield* manager.spawn(executable);
        const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);

        const submit1 = yield* handle.submitInput('x').pipe(Effect.fork);
        yield* received1;

        const submit2 = yield* handle.submitInput('y').pipe(Effect.fork);
        yield* received2;

        // First handler completes with exit(), but second is still running.
        yield* Deferred.succeed(gate1, undefined);
        yield* Fiber.join(submit1);

        const midStatus = yield* handle.status();
        expect(midStatus.state).toEqual(Process.State.RUNNING);

        // Second handler also completes with exit(), now activeHandlers === 0.
        yield* Deferred.succeed(gate2, undefined);
        yield* Fiber.join(submit2);

        const outputs = yield* Fiber.join(outputFiber);
        expect(Chunk.toReadonlyArray(outputs)).toHaveLength(2);

        const finalStatus = yield* handle.status();
        expect(finalStatus.state).toEqual(Process.State.COMPLETED);
      }),
    );
  });

  describe('service resolver', () => {
    it.effect(
      'resolves database service for operation executable',
      Effect.fn(function* ({ expect }) {
        const { service: dbService, rows } = makeInMemoryDatabase();
        const resolver = ServiceResolver.fromContext(Context.make(DatabaseService, dbService));
        const { manager } = yield* ProcessManager.ProcessManagerService;
        const { insertRow } = makeDbOperationExecutables();

        const handle = yield* manager.spawn(insertRow);
        const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);

        yield* handle.submitInput('row-1');
        const outputs = yield* Fiber.join(outputFiber);
        expect(Chunk.toReadonlyArray(outputs)).toEqual(['inserted: row-1']);
        expect(rows).toEqual(['row-1']);
      }),
    );

    it.effect(
      'resolves database service for query operation',
      Effect.fn(function* ({ expect }) {
        const { service: dbService, rows } = makeInMemoryDatabase();
        rows.push('alice', 'bob', 'alice-2');

        const resolver = ServiceResolver.fromContext(Context.make(DatabaseService, dbService));
        const { manager } = yield* ProcessManager.ProcessManagerService;
        const { queryRows } = makeDbOperationExecutables();

        const handle = yield* manager.spawn(queryRows);
        const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);

        yield* handle.submitInput('alice');
        const outputs = yield* Fiber.join(outputFiber);
        expect(Chunk.toReadonlyArray(outputs)).toEqual([['alice', 'alice-2']]);
      }),
    );

    it.effect(
      'fails with ServiceNotAvailableError when required service is missing',
      Effect.fn(function* ({ expect }) {
        const { manager } = yield* ProcessManager.ProcessManagerService;
        const { insertRow } = makeDbOperationExecutables();

        let caught: unknown;
        yield* manager.spawn(insertRow).pipe(
          Effect.asVoid,
          Effect.catchAllDefect((defect) => {
            caught = defect;
            return Effect.void;
          }),
        );

        expect(caught).toBeInstanceOf(ServiceNotAvailableError);
        expect((caught as ServiceNotAvailableError).message).toContain('@test/DatabaseService');
      }),
    );

    it.effect(
      'fails when resolver does not provide a required service',
      Effect.fn(function* ({ expect }) {
        const resolver = ServiceResolver.fromContext(Context.empty() as Context.Context<any>);
        const { manager } = yield* ProcessManager.ProcessManagerService;
        const { insertRow } = makeDbOperationExecutables();

        let caught: unknown;
        yield* manager.spawn(insertRow).pipe(
          Effect.asVoid,
          Effect.catchAllDefect((defect) => {
            caught = defect;
            return Effect.void;
          }),
        );

        expect(caught).toBeInstanceOf(ServiceNotAvailableError);
      }),
    );

    it.effect(
      'compose resolver merges multiple service sources',
      Effect.fn(function* ({ expect }) {
        const { service: dbService, rows } = makeInMemoryDatabase();

        const dbResolver = ServiceResolver.fromContext(Context.make(DatabaseService, dbService));

        const combined = ServiceResolver.compose(dbResolver);
        const { manager } = yield* ProcessManager.ProcessManagerService;
        const { insertRow } = makeDbOperationExecutables();

        const handle = yield* manager.spawn(insertRow);
        const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);

        yield* handle.submitInput('composed-row');
        const outputs = yield* Fiber.join(outputFiber);
        expect(Chunk.toReadonlyArray(outputs)).toEqual(['inserted: composed-row']);
        expect(rows).toEqual(['composed-row']);
      }),
    );

    it.effect(
      'processes without service requirements work with any resolver',
      Effect.fn(function* ({ expect }) {
        const resolver = ServiceResolver.fromContext(Context.empty() as Context.Context<any>);
        const { manager } = yield* ProcessManager.ProcessManagerService;
        const executable = makeSimpleExecutable();

        const handle = yield* manager.spawn(executable);
        const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);

        yield* handle.submitInput({ value: 42 });
        const outputs = yield* Fiber.join(outputFiber);
        expect(Chunk.toReadonlyArray(outputs)).toEqual([84]);
      }),
    );
  });

  describe('tracing', () => {
    it.effect(
      'calls traceInvocationStart for root process',
      Effect.fn(function* ({ expect }) {
        const invocationStarts: TracingService.FunctionInvocationPayload[] = [];
        const tracingService: Context.Tag.Service<TracingService> = {
          ...TracingService.noop,
          traceInvocationStart: Effect.fn(function* ({ payload }) {
            invocationStarts.push(payload);
            return { invocationId: ObjectId.random(), invocationTraceQueue: undefined };
          }),
        };

        const { manager } = yield* ProcessManager.ProcessManagerService;
        const executable = makeSimpleExecutable();

        const handle = yield* manager.spawn(executable);
        expect(invocationStarts).toHaveLength(1);

        const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);
        yield* handle.submitInput({ value: 5 });
        yield* Fiber.join(outputFiber);
      }),
    );

    it.effect(
      'does not call traceInvocationStart for child process',
      Effect.fn(function* ({ expect }) {
        const invocationStarts: TracingService.FunctionInvocationPayload[] = [];
        const tracingService: Context.Tag.Service<TracingService> = {
          ...TracingService.noop,
          traceInvocationStart: Effect.fn(function* ({ payload }) {
            invocationStarts.push(payload);
            return { invocationId: ObjectId.random(), invocationTraceQueue: undefined };
          }),
        };

        const { manager } = yield* ProcessManager.ProcessManagerService;
        const executable = makeSimpleExecutable();

        const parentHandle = yield* manager.spawn(executable);
        expect(invocationStarts).toHaveLength(1);

        const childHandle = yield* manager.spawn(executable, { parentProcessId: parentHandle.pid });
        expect(invocationStarts).toHaveLength(1);

        const outputFiber = yield* Stream.runCollect(childHandle.subscribeOutputs()).pipe(Effect.fork);
        yield* childHandle.submitInput({ value: 3 });
        yield* Fiber.join(outputFiber);
      }),
    );

    it.effect(
      'child process inherits parent trace context',
      Effect.fn(function* ({ expect }) {
        const messageId = ObjectId.random();
        const tracingService: Context.Tag.Service<TracingService> = {
          ...TracingService.noop,
          traceInvocationStart: Effect.fn(function* () {
            return { invocationId: ObjectId.random(), invocationTraceQueue: undefined };
          }),
        };

        const { manager } = yield* ProcessManager.ProcessManagerService;
        const executable = makeSimpleExecutable();

        const parentHandle = yield* manager.spawn(executable, {
          tracing: { message: messageId, toolCallId: 'tc-root' },
        });

        const childHandle = yield* manager.spawn(executable, {
          parentProcessId: parentHandle.pid,
          tracing: { toolCallId: 'tc-child' },
        });

        const childContext = manager.getTraceContext(childHandle.pid);
        expect(childContext).toBeDefined();
        expect(childContext!.parentMessage).toEqual(messageId);
        expect(childContext!.toolCallId).toEqual('tc-child');

        const outputFiber = yield* Stream.runCollect(parentHandle.subscribeOutputs()).pipe(Effect.fork);
        yield* parentHandle.submitInput({ value: 1 });
        yield* Fiber.join(outputFiber);

        const childOutputFiber = yield* Stream.runCollect(childHandle.subscribeOutputs()).pipe(Effect.fork);
        yield* childHandle.submitInput({ value: 2 });
        yield* Fiber.join(childOutputFiber);
      }),
    );

    it.effect(
      'cleans up trace context on process completion',
      Effect.fn(function* ({ expect }) {
        const tracingService: Context.Tag.Service<TracingService> = {
          ...TracingService.noop,
          traceInvocationStart: Effect.fn(function* () {
            return { invocationId: ObjectId.random(), invocationTraceQueue: undefined };
          }),
        };

        const { manager } = yield* ProcessManager.ProcessManagerService;
        const executable = makeSimpleExecutable();

        const handle = yield* manager.spawn(executable);
        expect(manager.getTraceContext(handle.pid)).toBeDefined();

        const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);
        yield* handle.submitInput({ value: 1 });
        yield* Fiber.join(outputFiber);

        expect(manager.getTraceContext(handle.pid)).toBeUndefined();
      }),
    );

    it.effect(
      'provides TracingService to process with correct context',
      Effect.fn(function* ({ expect }) {
        const capturedContexts: TracingService.TraceContext[] = [];
        const messageId = ObjectId.random();

        const tracingService: Context.Tag.Service<TracingService> = {
          ...TracingService.noop,
          traceInvocationStart: Effect.fn(function* () {
            return { invocationId: ObjectId.random(), invocationTraceQueue: undefined };
          }),
        };

        const tracingExecutable = Process.makeExecutable(
          {
            input: Schema.Void,
            output: Schema.String,
            services: [TracingService],
          },
          (ctx) =>
            Effect.gen(function* () {
              const tracing = yield* TracingService;

              return {
                init: () => Effect.void,
                handleInput: (_input: void) =>
                  Effect.sync(() => {
                    capturedContexts.push(tracing.getTraceContext());
                    ctx.submitOutput('done');
                    ctx.exit();
                  }),
                alarm: () => Effect.void,
                childEvent: () => Effect.void,
              };
            }),
        );

        const { manager } = yield* ProcessManager.ProcessManagerService;

        const handle = yield* manager.spawn(tracingExecutable, {
          tracing: { message: messageId, toolCallId: 'tc-42' },
        });

        const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);
        yield* handle.submitInput(undefined);
        yield* Fiber.join(outputFiber);

        expect(capturedContexts).toHaveLength(1);
        expect(capturedContexts[0].parentMessage).toEqual(messageId);
        expect(capturedContexts[0].toolCallId).toEqual('tc-42');
      }),
    );

    it.effect(
      'calls traceInvocationEnd on successful completion',
      Effect.fn(function* ({ expect }) {
        const invocationEnds: { trace: TracingService.InvocationTraceData; exception?: any }[] = [];
        const tracingService: Context.Tag.Service<TracingService> = {
          ...TracingService.noop,
          traceInvocationStart: Effect.fn(function* () {
            return { invocationId: ObjectId.random(), invocationTraceQueue: undefined };
          }),
          traceInvocationEnd: Effect.fn(function* (data) {
            invocationEnds.push(data);
          }),
        };

        const { manager } = yield* ProcessManager.ProcessManagerService;
        const executable = makeSimpleExecutable();

        const handle = yield* manager.spawn(executable);
        const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);
        yield* handle.submitInput({ value: 5 });
        yield* Fiber.join(outputFiber);

        expect(invocationEnds).toHaveLength(1);
        expect(invocationEnds[0].trace.invocationId).toBeDefined();
        expect(invocationEnds[0].exception).toBeUndefined();
      }),
    );

    it.effect(
      'calls traceInvocationEnd with exception on error',
      Effect.fn(function* ({ expect }) {
        const invocationEnds: { trace: TracingService.InvocationTraceData; exception?: any }[] = [];
        const tracingService: Context.Tag.Service<TracingService> = {
          ...TracingService.noop,
          traceInvocationStart: Effect.fn(function* () {
            return { invocationId: ObjectId.random(), invocationTraceQueue: undefined };
          }),
          traceInvocationEnd: Effect.fn(function* (data) {
            invocationEnds.push(data);
          }),
        };

        const failingExecutable = Process.makeExecutable(
          { input: Schema.Void, output: Schema.Void, services: [] },
          (_ctx) =>
            Effect.succeed({
              init: () => Effect.void,
              handleInput: (_input: void) => Effect.die(new Error('boom')),
              alarm: () => Effect.void,
              childEvent: () => Effect.void,
            }),
        );

        const { manager } = yield* ProcessManager.ProcessManagerService;
        const handle = yield* manager.spawn(failingExecutable);
        yield* handle.submitInput(undefined);

        const status = yield* handle.status();
        expect(status.state).toEqual(Process.State.FAILED);

        expect(invocationEnds).toHaveLength(1);
        expect(invocationEnds[0].trace.invocationId).toBeDefined();
        expect(invocationEnds[0].exception).toBeDefined();
      }),
    );

    it.effect(
      'does not call traceInvocationEnd for child process',
      Effect.fn(function* ({ expect }) {
        const invocationEnds: { trace: TracingService.InvocationTraceData; exception?: any }[] = [];
        const tracingService: Context.Tag.Service<TracingService> = {
          ...TracingService.noop,
          traceInvocationStart: Effect.fn(function* () {
            return { invocationId: ObjectId.random(), invocationTraceQueue: undefined };
          }),
          traceInvocationEnd: Effect.fn(function* (data) {
            invocationEnds.push(data);
          }),
        };

        const { manager } = yield* ProcessManager.ProcessManagerService;
        const executable = makeSimpleExecutable();

        const parentHandle = yield* manager.spawn(executable);
        const childHandle = yield* manager.spawn(executable, { parentProcessId: parentHandle.pid });

        const childOutputFiber = yield* Stream.runCollect(childHandle.subscribeOutputs()).pipe(Effect.fork);
        yield* childHandle.submitInput({ value: 3 });
        yield* Fiber.join(childOutputFiber);

        const childStatus = yield* childHandle.status();
        expect(childStatus.state).toEqual(Process.State.COMPLETED);
        expect(invocationEnds).toHaveLength(0);

        const parentOutputFiber = yield* Stream.runCollect(parentHandle.subscribeOutputs()).pipe(Effect.fork);
        yield* parentHandle.submitInput({ value: 1 });
        yield* Fiber.join(parentOutputFiber);

        expect(invocationEnds).toHaveLength(1);
      }),
    );
  });
});
