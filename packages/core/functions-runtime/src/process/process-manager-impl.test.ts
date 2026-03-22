//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as KeyValueStore from '@effect/platform/KeyValueStore';
import { describe, it } from '@effect/vitest';
import * as Chunk from 'effect/Chunk';
import * as Context from 'effect/Context';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import { TracingService } from '@dxos/functions';
import { ObjectId } from '@dxos/keys';
import { Operation, OperationHandlerSet } from '@dxos/operation';

import { ServiceNotAvailableError } from '../errors';
import * as Process from './Process';
import { ProcessManagerImpl } from './process-manager-impl';
import * as ServiceResolver from './ServiceResolver';
import * as StorageService from './StorageService';

//
// Test services
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
// Operations that require DatabaseService
//

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

//
// Basic operations (no extra services)
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

const makeOperationExecutables = () => {
  const handlerSet = OperationHandlerSet.make(DoubleHandler, EchoHandler);
  return {
    double: Process.makeOperationExecutable(Double, handlerSet),
    echo: Process.makeOperationExecutable(Echo, handlerSet),
  };
};

const makeDbOperationExecutables = () => {
  const handlerSet = OperationHandlerSet.make(InsertRowHandler, QueryRowsHandler);
  return {
    insertRow: Process.makeOperationExecutable(InsertRow, handlerSet),
    queryRows: Process.makeOperationExecutable(QueryRows, handlerSet),
  };
};

const makeSimpleExecutable = (): Process.Executable<{ value: number }, number> =>
  Process.makeExecutable(
    {
      input: Schema.Struct({ value: Schema.Number }),
      output: Schema.Number,
      services: [],
    },
    (ctx) =>
      Effect.succeed({
        handleInput: (input: { value: number }) =>
          Effect.sync(() => {
            ctx.submitOutput(input.value * 2);
            return Process.OutcomeDone as Process.Outcome;
          }),
        tick: () => Effect.succeed(Process.OutcomeSuspend as Process.Outcome),
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
          handleInput: (input: { key: string; value: string }) =>
            Effect.gen(function* () {
              yield* storage.set(input.key, input.value);
              const read = yield* storage.get(input.key);
              ctx.submitOutput(Option.getOrElse(read, () => 'NOT_FOUND'));
              return Process.OutcomeDone as Process.Outcome;
            }),
          tick: () => Effect.succeed(Process.OutcomeSuspend as Process.Outcome),
        };
      }),
  );

interface Gate {
  readonly latch: Deferred.Deferred<Process.Outcome>;
  readonly inputReceived: Deferred.Deferred<void>;
}

const makeControllableExecutable = (gates: Gate[]) => {
  let gateIndex = 0;
  return Process.makeExecutable(
    { input: Schema.String, output: Schema.String, services: [] },
    (ctx) =>
      Effect.succeed({
        handleInput: (input: string) =>
          Effect.gen(function* () {
            const gate = gates[gateIndex++];
            yield* Deferred.succeed(gate.inputReceived, undefined);
            const outcome = yield* gate.latch;
            ctx.submitOutput(`processed: ${input}`);
            return outcome;
          }),
        tick: () => Effect.succeed(Process.OutcomeSuspend as Process.Outcome),
      }),
  );
};

const makeManager = (opts?: {
  serviceResolver?: ServiceResolver.ServiceResolver;
  tracingService?: Context.Tag.Service<TracingService>;
  handlerSet?: OperationHandlerSet.OperationHandlerSet;
}) =>
  Effect.gen(function* () {
    const kvStore = yield* KeyValueStore.KeyValueStore;
    const registry = Registry.make();
    const manager = new ProcessManagerImpl({
      registry,
      kvStore,
      serviceResolver: opts?.serviceResolver,
      tracingService: opts?.tracingService,
      handlerSet: opts?.handlerSet,
    });
    return { registry, kvStore, manager };
  }).pipe(Effect.provide(KeyValueStore.layerMemory));

const makeGate = function* () {
  return {
    latch: yield* Deferred.make<Process.Outcome>(),
    inputReceived: yield* Deferred.make<void>(),
  } satisfies Gate;
};

describe('ProcessManagerImpl', () => {
  it.effect(
    'spawns a process and produces output',
    Effect.fn(function* ({ expect }) {
      const { manager } = yield* makeManager();
      const executable = makeSimpleExecutable();

      const handle = yield* manager.spawn(executable);
      expect(handle.id).toBeDefined();

      const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);

      yield* handle.submitInput({ value: 5 });

      const outputs = yield* Fiber.join(outputFiber);
      expect(Chunk.toReadonlyArray(outputs)).toEqual([10]);
    }),
  );

  it.effect(
    'tracks status through lifecycle',
    Effect.fn(function* ({ expect }) {
      const { manager } = yield* makeManager();
      const executable = makeSimpleExecutable();

      const handle = yield* manager.spawn(executable);

      const initialStatus = yield* handle.status();
      expect(initialStatus.state).toEqual(Process.State.RUNNING);
      expect(Option.isNone(initialStatus.exit)).toBe(true);
      expect(Option.isNone(initialStatus.completedAt)).toBe(true);

      const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);
      yield* handle.submitInput({ value: 3 });
      yield* Fiber.join(outputFiber);

      const completedStatus = yield* handle.status();
      expect(completedStatus.state).toEqual(Process.State.COMPLETED);
      expect(Option.isSome(completedStatus.exit)).toBe(true);
      expect(Option.isSome(completedStatus.completedAt)).toBe(true);
    }),
  );

  it.effect(
    'terminates a running process',
    Effect.fn(function* ({ expect }) {
      const { manager } = yield* makeManager();
      const executable = makeSimpleExecutable();

      const handle = yield* manager.spawn(executable);

      const runningStatus = yield* handle.status();
      expect(runningStatus.state).toEqual(Process.State.RUNNING);

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
      const { manager } = yield* makeManager();
      const executable = makeSimpleExecutable();

      const handle1 = yield* manager.spawn(executable);
      const handle2 = yield* manager.spawn(executable);

      const handles = yield* manager.list();
      expect(handles).toHaveLength(2);
      expect(handles.map((handle) => handle.id)).toContain(handle1.id);
      expect(handles.map((handle) => handle.id)).toContain(handle2.id);
    }),
  );

  it.effect(
    'attaches to an existing process',
    Effect.fn(function* ({ expect }) {
      const { manager } = yield* makeManager();
      const executable = makeSimpleExecutable();

      const handle = yield* manager.spawn(executable);
      const attached = yield* manager.attach(handle.id);
      expect(attached.id).toEqual(handle.id);

      const outputFiber = yield* Stream.runCollect(attached.subscribeOutputs()).pipe(Effect.fork);
      yield* attached.submitInput({ value: 7 });
      const outputs = yield* Fiber.join(outputFiber);
      expect(Chunk.toReadonlyArray(outputs)).toEqual([14]);
    }),
  );

  it.effect(
    'updates status atom on registry',
    Effect.fn(function* ({ expect }) {
      const { registry, manager } = yield* makeManager();
      const executable = makeSimpleExecutable();

      const handle = yield* manager.spawn(executable);

      const initialStatus = registry.get(handle.statusAtom);
      expect(initialStatus.state).toEqual(Process.State.RUNNING);

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
      const { manager } = yield* makeManager();
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
      const { manager } = yield* makeManager();
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
        const { kvStore, manager } = yield* makeManager();
        const executable = makeStorageExecutable() as Process.Executable<{ key: string; value: string }, string>;

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
        const { kvStore, manager } = yield* makeManager();
        const executable = makeStorageExecutable() as Process.Executable<{ key: string; value: string }, string>;

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
        const { kvStore, manager } = yield* makeManager();
        const executable = makeStorageExecutable() as Process.Executable<{ key: string; value: string }, string>;

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
        const { kvStore, manager } = yield* makeManager();
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
                handleInput: (input: { key: string; value: string }) =>
                  Effect.gen(function* () {
                    yield* storage.set(input.key, input.value);
                    return Process.OutcomeSuspend as Process.Outcome;
                  }),
                tick: () => Effect.succeed(Process.OutcomeSuspend as Process.Outcome),
              };
            }),
        ) as Process.Executable<{ key: string; value: string }, string>;

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
        const { manager } = yield* makeManager();
        const gates: Gate[] = [];

        const gate1 = yield* makeGate();
        const gate2 = yield* makeGate();
        gates.push(gate1, gate2);

        const executable = makeControllableExecutable(gates);
        const handle = yield* manager.spawn(executable);
        const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);

        const submit1 = yield* handle.submitInput('a').pipe(Effect.fork);
        const submit2 = yield* handle.submitInput('b').pipe(Effect.fork);

        yield* gate1.inputReceived;
        yield* gate2.inputReceived;

        yield* Deferred.succeed(gate1.latch, Process.OutcomeDone);
        yield* Fiber.join(submit1);

        yield* Deferred.succeed(gate2.latch, Process.OutcomeDone);
        yield* Fiber.join(submit2);

        const outputs = yield* Fiber.join(outputFiber);
        expect(Chunk.toReadonlyArray(outputs)).toHaveLength(2);

        const status = yield* handle.status();
        expect(status.state).toEqual(Process.State.COMPLETED);
      }),
    );
  });

  describe('outcome reconciliation', () => {
    it.effect(
      'mergeOutcomes: resume > suspend > done',
      Effect.fn(function* ({ expect }) {
        expect(Process.mergeOutcomes(Process.OutcomeDone, Process.OutcomeDone)).toEqual(Process.OutcomeDone);
        expect(Process.mergeOutcomes(Process.OutcomeDone, Process.OutcomeSuspend)).toEqual(Process.OutcomeSuspend);
        expect(Process.mergeOutcomes(Process.OutcomeSuspend, Process.OutcomeDone)).toEqual(Process.OutcomeSuspend);
        expect(Process.mergeOutcomes(Process.OutcomeDone, Process.OutcomeResume)).toEqual(Process.OutcomeResume);
        expect(Process.mergeOutcomes(Process.OutcomeResume, Process.OutcomeDone)).toEqual(Process.OutcomeResume);
        expect(Process.mergeOutcomes(Process.OutcomeSuspend, Process.OutcomeResume)).toEqual(Process.OutcomeResume);
        expect(Process.mergeOutcomes(Process.OutcomeResume, Process.OutcomeSuspend)).toEqual(Process.OutcomeResume);
        expect(Process.mergeOutcomes(Process.OutcomeSuspend, Process.OutcomeSuspend)).toEqual(Process.OutcomeSuspend);
        expect(Process.mergeOutcomes(Process.OutcomeResume, Process.OutcomeResume)).toEqual(Process.OutcomeResume);
      }),
    );

    it.effect(
      'suspend overrides done when handlers complete concurrently',
      Effect.fn(function* ({ expect }) {
        const { manager } = yield* makeManager();
        const gates: Gate[] = [];
        const gate1 = yield* makeGate();
        const gate2 = yield* makeGate();
        gates.push(gate1, gate2);

        const executable = makeControllableExecutable(gates);
        const handle = yield* manager.spawn(executable);

        const submit1 = yield* handle.submitInput('first').pipe(Effect.fork);
        const submit2 = yield* handle.submitInput('second').pipe(Effect.fork);

        yield* gate1.inputReceived;
        yield* gate2.inputReceived;

        yield* Deferred.succeed(gate1.latch, Process.OutcomeDone);
        yield* Fiber.join(submit1);

        const midStatus = yield* handle.status();
        expect(midStatus.state).toEqual(Process.State.RUNNING);

        yield* Deferred.succeed(gate2.latch, Process.OutcomeSuspend);
        yield* Fiber.join(submit2);

        const finalStatus = yield* handle.status();
        expect(finalStatus.state).toEqual(Process.State.RUNNING);
      }),
    );

    it.effect(
      'resume overrides suspend and triggers tick',
      Effect.fn(function* ({ expect }) {
        const { manager } = yield* makeManager();
        const tickCount = { value: 0 };
        const gates: Gate[] = [];
        const gate1 = yield* makeGate();
        const gate2 = yield* makeGate();
        gates.push(gate1, gate2);

        let gateIndex = 0;
        const executable: Process.Executable<string, string> = Process.makeExecutable(
          { input: Schema.String, output: Schema.String, services: [] },
          (ctx) =>
            Effect.succeed({
              handleInput: (input: string) =>
                Effect.gen(function* () {
                  const gate = gates[gateIndex++];
                  yield* Deferred.succeed(gate.inputReceived, undefined);
                  const outcome = yield* gate.latch;
                  ctx.submitOutput(`processed: ${input}`);
                  return outcome;
                }),
              tick: () =>
                Effect.sync(() => {
                  tickCount.value++;
                  if (tickCount.value <= 1) {
                    return Process.OutcomeSuspend as Process.Outcome;
                  }
                  ctx.submitOutput('tick-complete');
                  return Process.OutcomeDone as Process.Outcome;
                }),
            }),
        );

        const handle = yield* manager.spawn(executable);
        expect(tickCount.value).toEqual(1);

        const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);

        const submit1 = yield* handle.submitInput('a').pipe(Effect.fork);
        const submit2 = yield* handle.submitInput('b').pipe(Effect.fork);

        yield* gate1.inputReceived;
        yield* gate2.inputReceived;

        yield* Deferred.succeed(gate1.latch, Process.OutcomeSuspend);
        yield* Fiber.join(submit1);

        const midStatus = yield* handle.status();
        expect(midStatus.state).toEqual(Process.State.RUNNING);

        yield* Deferred.succeed(gate2.latch, Process.OutcomeResume);
        yield* Fiber.join(submit2);

        const outputs = yield* Fiber.join(outputFiber);
        const outputArray = Chunk.toReadonlyArray(outputs);
        expect(outputArray).toContain('tick-complete');
        expect(tickCount.value).toEqual(2);

        const finalStatus = yield* handle.status();
        expect(finalStatus.state).toEqual(Process.State.COMPLETED);
      }),
    );

    it.effect(
      'done only applies when all concurrent handlers return done',
      Effect.fn(function* ({ expect }) {
        const { manager } = yield* makeManager();
        const gates: Gate[] = [];
        const gate1 = yield* makeGate();
        const gate2 = yield* makeGate();
        gates.push(gate1, gate2);

        const executable = makeControllableExecutable(gates);
        const handle = yield* manager.spawn(executable);
        const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);

        const submit1 = yield* handle.submitInput('x').pipe(Effect.fork);
        const submit2 = yield* handle.submitInput('y').pipe(Effect.fork);

        yield* gate1.inputReceived;
        yield* gate2.inputReceived;

        yield* Deferred.succeed(gate1.latch, Process.OutcomeDone);
        yield* Fiber.join(submit1);

        const midStatus = yield* handle.status();
        expect(midStatus.state).toEqual(Process.State.RUNNING);

        yield* Deferred.succeed(gate2.latch, Process.OutcomeDone);
        yield* Fiber.join(submit2);

        const outputs = yield* Fiber.join(outputFiber);
        expect(Chunk.toReadonlyArray(outputs)).toHaveLength(2);

        const finalStatus = yield* handle.status();
        expect(finalStatus.state).toEqual(Process.State.COMPLETED);
      }),
    );
  });

  describe('aggregation executable', () => {
    it.effect(
      'folds inputs and finalizes on done',
      Effect.fn(function* ({ expect }) {
        const { manager } = yield* makeManager();
        const sumExecutable = Process.makeAggregationExecutable({
          input: Schema.Number,
          output: Schema.Number,
          initial: 0,
          reducer: (acc, input: number) =>
            Effect.succeed([acc + input, input < 0 ? Process.OutcomeDone : Process.OutcomeSuspend] as const),
          finalize: (acc) => acc,
        });

        const handle = yield* manager.spawn(sumExecutable);
        const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);

        yield* handle.submitInput(10);
        yield* handle.submitInput(20);
        yield* handle.submitInput(5);

        const midStatus = yield* handle.status();
        expect(midStatus.state).toEqual(Process.State.RUNNING);

        yield* handle.submitInput(-1);

        const outputs = yield* Fiber.join(outputFiber);
        expect(Chunk.toReadonlyArray(outputs)).toEqual([34]);

        const finalStatus = yield* handle.status();
        expect(finalStatus.state).toEqual(Process.State.COMPLETED);
      }),
    );

    it.effect(
      'supports effect-ful reducer',
      Effect.fn(function* ({ expect }) {
        const { manager } = yield* makeManager();
        const concatExecutable = Process.makeAggregationExecutable({
          input: Schema.String,
          output: Schema.String,
          initial: [] as string[],
          reducer: (acc, input: string) =>
            Effect.gen(function* () {
              yield* Effect.yieldNow();
              const next = [...acc, input];
              const outcome = input === 'END' ? Process.OutcomeDone : Process.OutcomeSuspend;
              return [next, outcome] as const;
            }),
          finalize: (acc) => acc.join(', '),
        });

        const handle = yield* manager.spawn(concatExecutable);
        const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);

        yield* handle.submitInput('hello');
        yield* handle.submitInput('world');
        yield* handle.submitInput('END');

        const outputs = yield* Fiber.join(outputFiber);
        expect(Chunk.toReadonlyArray(outputs)).toEqual(['hello, world, END']);
      }),
    );
  });

  describe('service resolver', () => {
    it.effect(
      'resolves database service for operation executable',
      Effect.fn(function* ({ expect }) {
        const { service: dbService, rows } = makeInMemoryDatabase();
        const resolver = ServiceResolver.fromContext(
          Context.make(DatabaseService, dbService),
        );
        const { manager } = yield* makeManager({ serviceResolver: resolver });
        const { insertRow } = makeDbOperationExecutables();

        const handle = yield* manager.spawn(insertRow as Process.Executable<string, string>);
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

        const resolver = ServiceResolver.fromContext(
          Context.make(DatabaseService, dbService),
        );
        const { manager } = yield* makeManager({ serviceResolver: resolver });
        const { queryRows } = makeDbOperationExecutables();

        const handle = yield* manager.spawn(queryRows as Process.Executable<string, readonly string[]>);
        const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);

        yield* handle.submitInput('alice');
        const outputs = yield* Fiber.join(outputFiber);
        expect(Chunk.toReadonlyArray(outputs)).toEqual([['alice', 'alice-2']]);
      }),
    );

    it.effect(
      'fails with ServiceNotAvailableError when required service is missing',
      Effect.fn(function* ({ expect }) {
        const { manager } = yield* makeManager();
        const { insertRow } = makeDbOperationExecutables();

        const result = yield* manager.spawn(insertRow as Process.Executable<string, string>).pipe(
          Effect.flip,
        );

        expect(result).toBeInstanceOf(ServiceNotAvailableError);
        expect(result.message).toContain('@test/DatabaseService');
      }),
    );

    it.effect(
      'fails when resolver does not provide a required service',
      Effect.fn(function* ({ expect }) {
        const resolver = ServiceResolver.fromContext(Context.empty() as Context.Context<any>);
        const { manager } = yield* makeManager({ serviceResolver: resolver });
        const { insertRow } = makeDbOperationExecutables();

        const result = yield* manager.spawn(insertRow as Process.Executable<string, string>).pipe(
          Effect.flip,
        );

        expect(result).toBeInstanceOf(ServiceNotAvailableError);
      }),
    );

    it.effect(
      'compose resolver merges multiple service sources',
      Effect.fn(function* ({ expect }) {
        const { service: dbService, rows } = makeInMemoryDatabase();

        const dbResolver = ServiceResolver.fromContext(
          Context.make(DatabaseService, dbService),
        );

        const combined = ServiceResolver.compose(dbResolver);
        const { manager } = yield* makeManager({ serviceResolver: combined });
        const { insertRow } = makeDbOperationExecutables();

        const handle = yield* manager.spawn(insertRow as Process.Executable<string, string>);
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
        const { manager } = yield* makeManager({ serviceResolver: resolver });
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

        const { manager } = yield* makeManager({ tracingService });
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

        const { manager } = yield* makeManager({ tracingService });
        const executable = makeSimpleExecutable();

        const parentHandle = yield* manager.spawn(executable);
        expect(invocationStarts).toHaveLength(1);

        const childHandle = yield* manager.spawn(executable, { parentProcessId: parentHandle.id });
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

        const { manager } = yield* makeManager({ tracingService });
        const executable = makeSimpleExecutable();

        const parentHandle = yield* manager.spawn(executable, {
          tracing: { message: messageId, toolCallId: 'tc-root' },
        });

        const childHandle = yield* manager.spawn(executable, {
          parentProcessId: parentHandle.id,
          tracing: { toolCallId: 'tc-child' },
        });

        const childContext = manager.getTraceContext(childHandle.id);
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

        const { manager } = yield* makeManager({ tracingService });
        const executable = makeSimpleExecutable();

        const handle = yield* manager.spawn(executable);
        expect(manager.getTraceContext(handle.id)).toBeDefined();

        const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);
        yield* handle.submitInput({ value: 1 });
        yield* Fiber.join(outputFiber);

        expect(manager.getTraceContext(handle.id)).toBeUndefined();
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
                handleInput: (_input: void) =>
                  Effect.sync(() => {
                    capturedContexts.push(tracing.getTraceContext());
                    ctx.submitOutput('done');
                    return Process.OutcomeDone as Process.Outcome;
                  }),
                tick: () => Effect.succeed(Process.OutcomeSuspend as Process.Outcome),
              };
            }),
        ) as Process.Executable<void, string>;

        const { manager } = yield* makeManager({ tracingService });

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

        const { manager } = yield* makeManager({ tracingService });
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
              handleInput: (_input: void) => Effect.die(new Error('boom')),
              tick: () => Effect.succeed(Process.OutcomeSuspend as Process.Outcome),
            }),
        ) as Process.Executable<void, void>;

        const { manager } = yield* makeManager({ tracingService });
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

        const { manager } = yield* makeManager({ tracingService });
        const executable = makeSimpleExecutable();

        const parentHandle = yield* manager.spawn(executable);
        const childHandle = yield* manager.spawn(executable, { parentProcessId: parentHandle.id });

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
