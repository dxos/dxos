//
// Copyright 2026 DXOS.org
//

import * as KeyValueStore from '@effect/platform/KeyValueStore';
import { Registry } from '@effect-atom/atom';
import { describe, it } from '@effect/vitest';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import { Database } from '@dxos/echo';
import { TracingService } from '@dxos/functions';
import { Operation, OperationHandlerSet } from '@dxos/operation';
import { Organization } from '@dxos/types';

import { TestDatabaseLayer } from '../testing';
import * as Process from './Process';
import * as ProcessManager from './ProcessManager';
import * as ProcessOperationInvoker from './ProcessOperationInvoker';
import * as ServiceResolver from './ServiceResolver';
import * as StorageService from './StorageService';

//
// Test services (for unit tests without full ECHO stack).
//

//
// Operation definitions.
//

const Double = Operation.make({
  meta: { key: 'org.dxos.test.double', name: 'Double' },
  input: Schema.Struct({ value: Schema.Number }),
  output: Schema.Number,
});

const handlers = OperationHandlerSet.make(
  Double.pipe(
    Operation.withHandler(
      Effect.fn(function* (input) {
        return input.value * 2;
      }),
    ),
  ),
);

/**
 * Never exits keeps adding numbers to the accumulator.
 */
const makeSumAggregator = () =>
  Process.makeExecutable(
    {
      key: 'test.sum-aggregator',
      input: Schema.Number,
      output: Schema.Number,
      services: [StorageService.StorageService],
    },
    (ctx) =>
      Effect.succeed({
        onSpawn: () =>
          Effect.gen(function* () {
            yield* StorageService.set(Schema.NumberFromString, 'acc', 0);
          }),
        onInput: (input: number) =>
          Effect.gen(function* () {
            let acc = yield* StorageService.get(Schema.NumberFromString, 'acc').pipe(Effect.flatten, Effect.orDie);
            acc += input;
            yield* StorageService.set(Schema.NumberFromString, 'acc', acc);
            ctx.submitOutput(acc);
          }),
        onAlarm: () => Effect.void,
        onChildEvent: () => Effect.void,
      }),
  );

/**
 * Waits for 500ms and then exits.
 */
const makeWaitingExecutable = () =>
  Process.makeExecutable({ key: 'test.waiting', input: Schema.Void, output: Schema.Void, services: [] }, (ctx) =>
    Effect.succeed({
      onSpawn: () =>
        Effect.gen(function* () {
          ctx.setAlarm(500);
        }),
      onInput: () => Effect.void,
      onAlarm: () =>
        Effect.gen(function* () {
          ctx.succeed();
        }),
      onChildEvent: () => Effect.void,
    }),
  );

const TestLayer = ProcessOperationInvoker.layer.pipe(
  Layer.provideMerge(ProcessManager.layer({ idGenerator: ProcessManager.SequentialProcessIdGenerator })),
  Layer.provide(ServiceResolver.layerRequirements(Database.Service)),
  Layer.provide(
    TestDatabaseLayer({
      types: [Organization.Organization],
    }),
  ),
  Layer.provide(KeyValueStore.layerMemory),
  Layer.provide(OperationHandlerSet.provide(handlers)),
  Layer.provide(TracingService.layerNoop),
  Layer.provideMerge(Registry.layer),
);

describe('ProcessManagerImpl', () => {
  it.effect(
    'spawns a process and produces output',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.ProcessManagerService;

      const executable = Process.fromOperation(Double, handlers);

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
    'alarms',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.ProcessManagerService;
      const handle = yield* manager.spawn(makeWaitingExecutable());
      {
        const status = yield* handle.status();
        expect(status.state).toEqual(Process.State.HYBERNATING);
      }
      {
        // Process stays HYBERNATING until the alarm fires; `runToCompletion` would block until SUCCEEDED.
        // Alarms use real `setTimeout`; `it.effect` uses TestClock, so `Effect.sleep` would not advance wall time.
        yield* Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 600)));
        const status = yield* handle.status();
        expect(status.state).toEqual(Process.State.SUCCEEDED);
      }
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'termination',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.ProcessManagerService;
      const handle = yield* manager.spawn(makeWaitingExecutable());
      {
        yield* handle.terminate();
        const status = yield* handle.status();
        expect(status.state).toEqual(Process.State.TERMINATED);
      }
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'stateful',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.ProcessManagerService;
      const handle = yield* manager.spawn(makeSumAggregator());
      let lastOutput = 0;
      yield* handle.subscribeOutputs().pipe(
        Stream.runForEach((output) =>
          Effect.sync(() => {
            lastOutput = output;
          }),
        ),
        Effect.fork,
      );
      {
        yield* handle.runToCompletion();
        const status = yield* handle.status();
        expect(status.state).toEqual(Process.State.IDLE);
      }
      {
        yield* handle.submitInput(1);
        yield* handle.submitInput(2);
        yield* handle.runToCompletion();
        const status = yield* handle.status();
        expect(status.state).toEqual(Process.State.IDLE);
        expect(lastOutput).toEqual(3);
      }
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'lists spawned processes',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.ProcessManagerService;
      const executable = makeWaitingExecutable();

      const handle1 = yield* manager.spawn(executable);
      const handle2 = yield* manager.spawn(executable);

      const handles = yield* manager.list();
      expect(handles).toHaveLength(2);
      expect(handles.map((handle) => handle.pid)).toContain(handle1.pid);
      expect(handles.map((handle) => handle.pid)).toContain(handle2.pid);
      yield* handle1.terminate();
      yield* handle2.terminate();
    }, Effect.provide(TestLayer)),
  );

  describe('ProcessMonitor', () => {
    it.effect(
      'processTree lists spawned process with expected pid and state',
      Effect.fn(function* ({ expect }) {
        const manager = yield* ProcessManager.ProcessManagerService;
        const monitor = yield* Process.ProcessMonitorService;

        const handle = yield* manager.spawn(makeWaitingExecutable());

        const tree = yield* monitor.processTree;
        expect(tree).toHaveLength(1);
        expect(tree[0]!.pid).toEqual(handle.pid);
        expect(tree[0]!.parentPid).toBeNull();
        expect(tree[0]!.state).toEqual(Process.State.HYBERNATING);

        yield* handle.terminate();
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'processTree records parentPid for child processes',
      Effect.fn(function* ({ expect }) {
        const manager = yield* ProcessManager.ProcessManagerService;
        const monitor = yield* Process.ProcessMonitorService;

        const parent = yield* manager.spawn(makeWaitingExecutable());
        const child = yield* manager.spawn(makeWaitingExecutable(), { parentProcessId: parent.pid });

        const tree = yield* monitor.processTree;
        expect(tree).toHaveLength(2);

        const parentInfo = tree.find((node) => node.pid === parent.pid);
        const childInfo = tree.find((node) => node.pid === child.pid);
        expect(parentInfo?.parentPid).toBeNull();
        expect(childInfo?.parentPid).toEqual(parent.pid);

        yield* parent.terminate();
        yield* child.terminate();
      }, Effect.provide(TestLayer)),
    );

    it.effect(
      'processTree exposes input, output, and wall-time metrics',
      Effect.fn(function* ({ expect }) {
        const manager = yield* ProcessManager.ProcessManagerService;
        const monitor = yield* Process.ProcessMonitorService;

        const handle = yield* manager.spawn(makeSumAggregator());
        yield* handle.submitInput(1);
        yield* handle.runToCompletion();

        const tree = yield* monitor.processTree;
        const info = tree.find((node) => node.pid === handle.pid);
        expect(info?.metrics.inputCount).toEqual(1);
        expect(info?.metrics.outputCount).toEqual(1);
        expect(info?.metrics.wallTime).toBeGreaterThanOrEqual(0);

        yield* handle.terminate();
      }, Effect.provide(TestLayer)),
    );
  });
});
