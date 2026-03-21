//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as KeyValueStore from '@effect/platform/KeyValueStore';
import { describe, it } from '@effect/vitest';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import { Operation, OperationHandlerSet } from '@dxos/operation';

import * as Process from './Process';
import { ProcessManagerImpl } from './process-manager-impl';
import * as StorageService from './StorageService';

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

const makeManager = () => {
  const store = new Map<string, string>();
  const registry = Registry.make();
  const kvStore = KeyValueStore.make({
    get: (key: string) => Effect.succeed(Option.fromNullable(store.get(key))),
    getUint8Array: (key: string) =>
      Effect.succeed(Option.map(Option.fromNullable(store.get(key)), (value) => new TextEncoder().encode(value))),
    set: (key: string, value: string | Uint8Array) =>
      Effect.sync(() => {
        store.set(key, typeof value === 'string' ? value : new TextDecoder().decode(value));
      }),
    remove: (key: string) =>
      Effect.sync(() => {
        store.delete(key);
      }),
    clear: Effect.sync(() => store.clear()),
    size: Effect.sync(() => store.size),
  });
  const manager = new ProcessManagerImpl({ registry, kvStore });
  return { registry, kvStore, store, manager };
};

describe('ProcessManagerImpl', () => {
  it.effect(
    'spawns a process and produces output',
    Effect.fn(function* ({ expect }) {
      const { manager } = makeManager();
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
      const { manager } = makeManager();
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
      const { manager } = makeManager();
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
      const { manager } = makeManager();
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
      const { manager } = makeManager();
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
      const { registry, manager } = makeManager();
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
      const { manager } = makeManager();
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
      const { manager } = makeManager();
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

  it.effect(
    'provides scoped storage to processes',
    Effect.fn(function* ({ expect }) {
      const { store, manager } = makeManager();
      const executable = makeStorageExecutable() as Process.Executable<{ key: string; value: string }, string>;

      const handle = yield* manager.spawn(executable);

      const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.fork);
      yield* handle.submitInput({ key: 'greeting', value: 'hello' });
      const outputs = yield* Fiber.join(outputFiber);
      expect(Chunk.toReadonlyArray(outputs)).toEqual(['hello']);

      const rawKeys = [...store.keys()];
      expect(rawKeys).toHaveLength(1);
      expect(rawKeys[0]).toContain(`process/${handle.id}/greeting`);
    }),
  );

  it.effect(
    'isolates storage between processes',
    Effect.fn(function* ({ expect }) {
      const { store, manager } = makeManager();
      const executable = makeStorageExecutable() as Process.Executable<{ key: string; value: string }, string>;

      const handle1 = yield* manager.spawn(executable);
      const handle2 = yield* manager.spawn(executable);

      const fiber1 = yield* Stream.runCollect(handle1.subscribeOutputs()).pipe(Effect.fork);
      const fiber2 = yield* Stream.runCollect(handle2.subscribeOutputs()).pipe(Effect.fork);

      yield* handle1.submitInput({ key: 'data', value: 'from-1' });
      yield* handle2.submitInput({ key: 'data', value: 'from-2' });

      yield* Fiber.join(fiber1);
      yield* Fiber.join(fiber2);

      const rawKeys = [...store.keys()];
      expect(rawKeys).toHaveLength(2);
      expect(store.get(`process/${handle1.id}/data`)).toEqual('from-1');
      expect(store.get(`process/${handle2.id}/data`)).toEqual('from-2');
    }),
  );
});
