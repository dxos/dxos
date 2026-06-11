//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as KeyValueStore from '@effect/platform/KeyValueStore';
import { describe, it } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Chunk from 'effect/Chunk';
import * as Deferred from 'effect/Deferred';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as PubSub from 'effect/PubSub';
import * as Queue from 'effect/Queue';
import * as Ref from 'effect/Ref';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as TestClock from 'effect/TestClock';

import {
  Operation,
  OperationHandlerSet,
  Process,
  ServiceNotAvailableError,
  ServiceResolver,
  Trace,
} from '@dxos/compute';
import * as StorageService from '@dxos/compute/StorageService';
import { Annotation, Database, DXN } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { Organization } from '@dxos/types';

import { ProcessStore } from './process-store';
import * as ProcessManager from './ProcessManager';
import { TestDatabaseLayer } from './testing';

//
// Test services (for unit tests without full ECHO stack).
//

//
// Operation definitions.
//

const Double = Operation.make({
  meta: { key: DXN.make('org.dxos.test.double'), name: 'Double' },
  input: Schema.Struct({ value: Schema.Number }),
  output: Schema.Number,
});

const Failing = Operation.make({
  meta: { key: DXN.make('org.dxos.test.failing'), name: 'Failing' },
  input: Schema.Void,
  output: Schema.Void,
});

// Carries an arbitrary live reference (e.g. a model/handle) that is not JSON-serializable.
const WithLiveRef = Operation.make({
  meta: { key: DXN.make('org.dxos.test.withLiveRef'), name: 'WithLiveRef' },
  input: Schema.Struct({ ref: Schema.Any }),
  output: Schema.Number,
});

/**
 * Child used by {@link ParentInvoker} to exercise the parent-child SUCCEEDED state invariant.
 */
const ChildPassthrough = Operation.make({
  meta: { key: DXN.make('org.dxos.test.childPassthrough'), name: 'ChildPassthrough' },
  input: Schema.Number,
  output: Schema.Number,
});

/**
 * Parent that invokes {@link ChildPassthrough} via `Operation.invoke` (blocking await).
 * Used to reproduce the DX-999 race where a late child-exit notification can clobber
 * a parent's SUCCEEDED status.
 */
const ParentInvoker = Operation.make({
  meta: { key: DXN.make('org.dxos.test.parentInvoker'), name: 'ParentInvoker' },
  input: Schema.Number,
  output: Schema.Number,
});

/**
 * Per-test gate for {@link SlowChild}; set in the repro test before spawning the parent.
 */
const SlowChildGate = {
  taskSignal: undefined as Queue.Queue<void> | undefined,
  completeDeferred: undefined as Deferred.Deferred<void> | undefined,
  alarmStarted: undefined as Deferred.Deferred<void> | undefined,
  alarmResume: undefined as Deferred.Deferred<void> | undefined,
  alarmHandlerFinished: undefined as Ref.Ref<boolean> | undefined,
};

const SlowChild = Operation.make({
  meta: { key: DXN.make('org.dxos.test.slowChild'), name: 'SlowChild' },
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
  Failing.pipe(
    Operation.withHandler(
      Effect.fn(function* () {
        return yield* Effect.die('Test Error');
      }),
    ),
  ),
  WithLiveRef.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ ref }) {
        return ref.value;
      }),
    ),
  ),
  SlowChild.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ value }) {
        if (SlowChildGate.taskSignal === undefined || SlowChildGate.completeDeferred === undefined) {
          return yield* Effect.die('SlowChild gate not initialized');
        }
        yield* Queue.offer(SlowChildGate.taskSignal, undefined);
        yield* Deferred.await(SlowChildGate.completeDeferred);
        return value;
      }),
    ),
  ),
  ChildPassthrough.pipe(
    Operation.withHandler(
      Effect.fn(function* (input) {
        return input;
      }),
    ),
  ),
  ParentInvoker.pipe(
    Operation.withHandler(
      Effect.fn(function* (input) {
        return yield* Operation.invoke(ChildPassthrough, input);
      }),
    ),
  ),
);

/**
 * Parent whose alarm handler invokes {@link SlowChild} and blocks until it completes.
 * Mirrors agent-process awaiting an async tool call during shutdown.
 */
const makeParentAwaitingChild = () =>
  Process.make(
    {
      key: 'test.parent-awaiting-child',
      input: Schema.Void,
      output: Schema.Void,
      services: [ProcessManager.ProcessOperationInvoker.Service],
    },
    (ctx) =>
      Effect.succeed({
        onSpawn: () => Effect.void,
        onInput: () =>
          Effect.sync(() => {
            ctx.setAlarm(0);
          }),
        onAlarm: () =>
          Effect.gen(function* () {
            const invoker = yield* ProcessManager.ProcessOperationInvoker.Service;
            // Detach child invocation so the alarm handler can block on external completion,
            // matching agent-process awaiting an async tool call at shutdown.
            yield* Deferred.succeed(SlowChildGate.alarmStarted!, undefined);
            yield* Effect.fork(invoker.invokeFiber(SlowChild, { value: 1 }).pipe(Effect.asVoid));
            yield* Deferred.await(SlowChildGate.alarmResume!);
            yield* Ref.set(SlowChildGate.alarmHandlerFinished!, true);
            ctx.succeed();
          }),
        onChildEvent: () => Effect.void,
      }),
  );

/**
 * Never exits keeps adding numbers to the accumulator.
 */
const makeSumAggregator = () =>
  Process.make(
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
  Process.make({ key: 'test.waiting', input: Schema.Void, output: Schema.Void, services: [] }, (ctx) =>
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

const TestLayer = ProcessManager.ProcessOperationInvoker.layer.pipe(
  Layer.provideMerge(ProcessManager.layer({ idGenerator: ProcessManager.SequentialIdGenerator })),
  Layer.provide(ServiceResolver.layerRequirements(Database.Service)),
  Layer.provide(
    TestDatabaseLayer({
      types: [Organization.Organization],
    }),
  ),
  Layer.provide(KeyValueStore.layerMemory),
  Layer.provide(OperationHandlerSet.provide(handlers)),
  Layer.provideMerge(Registry.layer),
  Layer.provide(Trace.layerNoop),
);

describe('ManagerImpl', () => {
  it.effect(
    'spawns a process and produces output',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;

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
    'runAndExit submits inputs and completes the stream at IDLE or SUCCEEDED',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(Process.fromOperation(Double, handlers));
      const outputs = yield* handle.runAndExit({ inputs: [{ value: 7 }] }).pipe(Stream.runCollect);
      expect(Chunk.toReadonlyArray(outputs)).toEqual([14]);
      expect(handle.status.state).toEqual(Process.State.SUCCEEDED);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'runAndExit completes at IDLE for processes that stay alive after output',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(makeSumAggregator());
      const outputs = yield* handle.runAndExit({ inputs: [4] }).pipe(Stream.runCollect);
      expect(Chunk.toReadonlyArray(outputs)).toEqual([4]);
      expect(handle.status.state).toEqual(Process.State.IDLE);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'runAndExit fails when the process is TERMINATED',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(makeSumAggregator());
      yield* handle.terminate();
      const exit = yield* handle.runAndExit({ inputs: [1] }).pipe(Stream.runCollect, Effect.exit);
      expect(Exit.isFailure(exit)).toEqual(true);
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
    'invokes an operation whose input is not JSON-serializable',
    Effect.fn(function* ({ expect }) {
      // Operations may carry live references in their input (e.g. a model or handle).
      // The durable process store JSON-serializes the input event; a non-serializable
      // value (here, a cycle) must not fail the invocation. The handler still runs with
      // the original value — persistence degrades to a best-effort null.
      const ref: { value: number; self?: unknown } = { value: 42 };
      ref.self = ref;
      const result = yield* Operation.invoke(WithLiveRef, { ref });
      expect(result).toEqual(42);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'alarms',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(makeWaitingExecutable());
      expect(handle.status.state).toEqual(Process.State.HYBERNATING);

      // Alarms are scheduled on the ambient `Clock`, so advancing the TestClock fires them
      // deterministically (no real-time wait).
      yield* TestClock.adjust(Duration.millis(500));
      yield* handle.runToCompletion();
      expect(handle.status.state).toEqual(Process.State.SUCCEEDED);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'termination',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(makeWaitingExecutable());
      {
        yield* handle.terminate();
        expect(handle.status.state).toEqual(Process.State.TERMINATED);
      }
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'stateful',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(makeSumAggregator());
      let lastOutput = 0,
        outputCount = 0;
      yield* handle.subscribeOutputs().pipe(
        Stream.runForEach((output) =>
          Effect.sync(() => {
            lastOutput = output;
            outputCount++;
          }),
        ),
        Effect.fork,
      );
      {
        yield* handle.runToCompletion();
        expect(handle.status.state).toEqual(Process.State.IDLE);
      }
      {
        yield* handle.submitInput(1);
        yield* handle.submitInput(2);
        yield* handle.runToCompletion();
        expect(handle.status.state).toEqual(Process.State.IDLE);
        // TODO(dmaretskyi): Output streaming is async, not sure how to sync it.
        yield* Effect.promise(() => expect.poll(() => outputCount).toEqual(2));
        yield* Effect.promise(() => expect.poll(() => lastOutput).toEqual(3));
      }
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'lists spawned processes',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
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
        const manager = yield* ProcessManager.Service;
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
        const manager = yield* ProcessManager.Service;
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
        const manager = yield* ProcessManager.Service;
        const monitor = yield* Process.ProcessMonitorService;

        const handle = yield* manager.spawn(makeSumAggregator());
        yield* handle.submitInput(1);
        yield* handle.runToCompletion();

        log('get tree');
        const tree = yield* monitor.processTree;
        const info = tree.find((node) => node.pid === handle.pid);
        expect(info?.metrics.inputCount).toEqual(1);
        expect(info?.metrics.outputCount).toEqual(1);
        expect(info?.metrics.wallTime).toBeGreaterThanOrEqual(0);

        const pretty = Process.prettyProcessTree(tree);
        expect(pretty).toContain('[in:1 out:1 wall:');

        yield* handle.terminate();
      }, Effect.provide(TestLayer)),
    );
  });

  it.effect(
    'runAndExit on successful operation',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(Process.fromOperation(Double, handlers));
      const outputs = yield* handle.runAndExit({ inputs: [{ value: 11 }] }).pipe(Stream.runCollect);
      expect(Chunk.toReadonlyArray(outputs)).toEqual([22]);
      expect(handle.status.state).toEqual(Process.State.SUCCEEDED);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'parent process remains SUCCEEDED after child completes — requestChildEvent race (DX-999)',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;

      const handle = yield* manager.spawn(Process.fromOperation(ParentInvoker, handlers));
      const outputs = yield* handle.runAndExit({ inputs: [7] }).pipe(Stream.runCollect);
      expect(Chunk.toReadonlyArray(outputs)).toEqual([7]);

      // Drain any background child-cleanup callbacks. Without the fix in
      // ProcessHandle.requestChildEvent, the late child-exit notification would
      // re-enter #runHandler after the parent set #finished=true, clobbering
      // SUCCEEDED with RUNNING and leaving the process permanently stuck.
      yield* Effect.yieldNow();
      yield* Effect.yieldNow();

      expect(handle.status.state).toEqual(Process.State.SUCCEEDED);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'runAndExit on failing operation',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(Process.fromOperation(Failing, handlers));
      const exit = yield* handle.runAndExit({ inputs: [undefined] }).pipe(Stream.runCollect, Effect.exit);
      expect(Exit.isFailure(exit)).toEqual(true);
      expect(exit).toEqual(Exit.die('Error: Test Error'));
      expect(handle.status.state).toEqual(Process.State.FAILED);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'runAndExit on interrupted operation',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(makeWaitingExecutable());
      const collectFiber = yield* handle.runAndExit({ inputs: [] }).pipe(Stream.runCollect, Effect.fork);
      yield* Fiber.interrupt(collectFiber);
      const exit = yield* Fiber.join(collectFiber).pipe(Effect.exit);
      expect(Exit.isFailure(exit)).toEqual(true);
      if (Exit.isFailure(exit)) {
        expect(Cause.isInterruptedOnly(exit.cause)).toEqual(true);
      }
    }, Effect.provide(TestLayer)),
  );
});

describe('ProcessOperationInvoker', () => {
  it.effect(
    'spawns a process and produces output',
    Effect.fn(function* ({ expect }) {
      const invoker = yield* ProcessManager.ProcessOperationInvoker.Service;
      const fiber = yield* invoker.invokeFiber(Double, { value: 5 });
      const output = yield* fiber.await;
      expect(output).toEqual(Exit.succeed(10));
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'attaches to a running process and produces output',
    Effect.fn(function* ({ expect }) {
      const invoker = yield* ProcessManager.ProcessOperationInvoker.Service;
      const fiber1 = yield* invoker.invokeFiber(Double, { value: 5 });

      const fiber2 = yield* invoker.attachFiber(fiber1.pid);
      const output = yield* fiber2.await;
      expect(output).toEqual(Exit.succeed(10));
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'attaches to a completedprocess and produces output',
    Effect.fn(function* ({ expect }) {
      const invoker = yield* ProcessManager.ProcessOperationInvoker.Service;
      const fiber1 = yield* invoker.invokeFiber(Double, { value: 5 });
      yield* fiber1.await;

      const fiber2 = yield* invoker.attachFiber(fiber1.pid);
      const output = yield* fiber2.await;
      expect(output).toEqual(Exit.succeed(10));
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'fails when the operation fails',
    Effect.fn(function* ({ expect }) {
      const invoker = yield* ProcessManager.ProcessOperationInvoker.Service;
      const fiber = yield* invoker.invokeFiber(Failing, undefined);
      const output = yield* fiber.await;
      expect(output).toEqual(Exit.die('Test Error'));
    }, Effect.provide(TestLayer)),
  );
});

//
// Environment inheritance for nested operation invocations.
//
// When a parent operation invokes a child via `Operation.invoke`, the child
// must inherit the parent's `ProcessManager.Environment` (space, conversation)
// unless explicitly overridden in `InvokeOptions`. This keeps space-affinity
// service resolution (e.g. `Database.Service`) coherent across the call tree
// instead of forcing every call site to thread the space id manually.
//

describe('ProcessOperationInvoker environment inheritance', () => {
  // Operation whose handler reports the spaceId visible through the
  // strict resolver below. If `Database.Service` resolves, the test layer
  // has correctly propagated the space context from the parent.
  const ChildOp = Operation.make({
    meta: { key: DXN.make('org.dxos.test.invoker.child'), name: 'Child' },
    input: Schema.Void,
    output: Schema.Struct({ spaceId: Schema.String }),
    services: [Database.Service],
  });

  // Operation that, from its own handler, invokes `ChildOp` and surfaces the
  // resulting spaceId so the test can compare it against the expected one.
  const ParentOp = Operation.make({
    meta: { key: DXN.make('org.dxos.test.invoker.parent'), name: 'Parent' },
    input: Schema.Struct({
      override: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({ childSpaceId: Schema.String }),
  });

  const inheritanceHandlers = OperationHandlerSet.make(
    ChildOp.pipe(
      Operation.withHandler(
        Effect.fn(function* () {
          const { db } = yield* Database.Service;
          return { spaceId: db.spaceId };
        }),
      ),
    ),
    ParentOp.pipe(
      Operation.withHandler(
        Effect.fn(function* (input) {
          const result = yield* Operation.invoke(
            ChildOp,
            undefined,
            input.override !== undefined ? { spaceId: input.override as any } : undefined,
          );
          return { childSpaceId: result.spaceId };
        }),
      ),
    ),
  );

  /**
   * Build a `ServiceResolver` that mirrors the production `LayerStack`:
   * `Database.Service` materialises only when the caller supplies a `space`
   * in the {@link ServiceResolver.ResolutionContext}. Spawns without a space
   * fail with the exact `ServiceNotAvailable` shape the live runtime emits.
   *
   * Closed over the live test database so the resolved service is the same
   * one the outer test fiber already holds.
   */
  const SpaceAwareResolverLayer = Layer.effect(
    ServiceResolver.ServiceResolver,
    Effect.gen(function* () {
      const dbService = yield* Database.Service;
      return ServiceResolver.make((tag, context) =>
        Effect.gen(function* () {
          if (tag.key !== Database.Service.key) {
            return yield* Effect.fail(new ServiceNotAvailableError(String(tag.key)));
          }
          if (context.space !== dbService.db.spaceId) {
            return yield* Effect.fail(
              new ServiceNotAvailableError(
                `Database.Service requires space context (got ${context.space ?? 'none'}, want ${dbService.db.spaceId})`,
              ),
            );
          }
          return dbService as any;
        }),
      );
    }),
  );

  const InheritanceTestLayer = ProcessManager.ProcessOperationInvoker.layer.pipe(
    Layer.provideMerge(ProcessManager.layer({ idGenerator: ProcessManager.SequentialIdGenerator })),
    Layer.provideMerge(SpaceAwareResolverLayer),
    Layer.provideMerge(
      TestDatabaseLayer({
        types: [Organization.Organization],
      }),
    ),
    Layer.provide(KeyValueStore.layerMemory),
    Layer.provide(OperationHandlerSet.provide(inheritanceHandlers)),
    Layer.provideMerge(Registry.layer),
    Layer.provide(Trace.layerNoop),
  );

  it.effect(
    "child operations inherit the parent process's space when no options are supplied",
    Effect.fn(function* ({ expect }) {
      const { db } = yield* Database.Service;
      const invoker = yield* ProcessManager.ProcessOperationInvoker.Service;

      const fiber = yield* invoker.invokeFiber(
        ParentOp,
        { override: undefined },
        { environment: { space: db.spaceId } },
      );
      const output = yield* fiber.await;
      expect(output).toEqual(Exit.succeed({ childSpaceId: db.spaceId }));
    }, Effect.provide(InheritanceTestLayer)),
  );

  it.effect(
    'child operation options override the inherited space',
    Effect.fn(function* ({ expect }) {
      const { db } = yield* Database.Service;
      const invoker = yield* ProcessManager.ProcessOperationInvoker.Service;

      // The override is a bogus space id; the strict resolver refuses to
      // materialise `Database.Service` for it. A successful trip through the
      // override path therefore surfaces as a child-side resolution failure,
      // which propagates as a die.
      const fiber = yield* invoker.invokeFiber(
        ParentOp,
        { override: 'BBOGUS00000000000000000000' },
        { environment: { space: db.spaceId } },
      );
      const output = yield* fiber.await;
      expect(Exit.isFailure(output)).toBe(true);
      const cause = Exit.isFailure(output) ? Cause.pretty(output.cause) : '';
      expect(cause).toContain('Database.Service requires space context');
      expect(cause).toContain('BBOGUS00000000000000000000');
    }, Effect.provide(InheritanceTestLayer)),
  );

  it.effect(
    'top-level invocations with no environment fail to resolve space-affinity services',
    Effect.fn(function* ({ expect }) {
      const invoker = yield* ProcessManager.ProcessOperationInvoker.Service;

      // No environment is set on the top-level spawn, so no space context
      // exists for `Database.Service` resolution. The failure surfaces while
      // spawning (the runtime resolves declared `services` eagerly), so the
      // entire `invokeFiber` call is wrapped in `Effect.exit` rather than
      // awaiting a fiber that never gets created. Confirms the resolver is
      // actually strict and the inheritance tests above aren't passing by
      // accident.
      const spawnExit = yield* invoker.invokeFiber(ChildOp, undefined).pipe(Effect.exit);
      expect(Exit.isFailure(spawnExit)).toBe(true);
      const cause = Exit.isFailure(spawnExit) ? Cause.pretty(spawnExit.cause) : '';
      expect(cause).toContain('Database.Service requires space context');
      expect(cause).toContain('got none');
    }, Effect.provide(InheritanceTestLayer)),
  );

  it.effect(
    "child operations inherit the parent process's conversation when no options are supplied",
    Effect.fn(function* ({ expect }) {
      const { db } = yield* Database.Service;
      const invoker = yield* ProcessManager.ProcessOperationInvoker.Service;
      const monitor = yield* Process.ProcessMonitorService;
      const manager = yield* ProcessManager.Service;

      const conversation = 'dxn:queue:test-conversation' as DXN.DXN;

      const fiber = yield* invoker.invokeFiber(
        ParentOp,
        { override: undefined },
        { environment: { space: db.spaceId, conversation } },
      );
      yield* fiber.await;

      // The parent op spawns the child via Operation.invoke; locate the
      // child's handle through the process tree and assert its environment
      // carries both inherited fields.
      const tree = yield* monitor.processTree;
      const childInfo = tree.find((node) => node.parentPid === fiber.pid);
      if (!childInfo) {
        throw new Error('child process not present in process tree');
      }
      const childHandle = yield* manager.attach(childInfo.pid);
      expect(childHandle.environment).toEqual({ space: db.spaceId, conversation });
    }, Effect.provide(InheritanceTestLayer)),
  );
});

describe('ProcessOperationInvoker invocations', () => {
  it.effect(
    'publishes a success event with the output',
    Effect.fn(function* ({ expect }) {
      const invoker = yield* ProcessManager.ProcessOperationInvoker.Service;
      yield* Effect.scoped(
        Effect.gen(function* () {
          // Subscribe before invoking so the event is not missed.
          const events = yield* PubSub.subscribe(invoker.invocations);

          const output = yield* invoker.invoke(Double, { value: 5 });
          expect(output).toEqual(10);

          const event = yield* Queue.take(events);
          expect(event.operation.meta.key).toEqual(Double.meta.key);
          expect(event.output).toEqual(10);
        }),
      );
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'does not publish an event when the operation fails (error propagates)',
    Effect.fn(function* ({ expect }) {
      const invoker = yield* ProcessManager.ProcessOperationInvoker.Service;
      yield* Effect.scoped(
        Effect.gen(function* () {
          const events = yield* PubSub.subscribe(invoker.invocations);

          const exit = yield* invoker.invoke(Failing).pipe(Effect.exit);
          expect(Exit.isFailure(exit)).toBe(true);

          // No success event should be queued for a failed invocation.
          expect(yield* Queue.size(events)).toBe(0);
        }),
      );
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'forwards notify options onto the spawned process params',
    Effect.fn(function* ({ expect }) {
      // Notifications ride the process monitor: `notify` is forwarded onto the spawned process's params
      // (and thereby surfaced on Process.Info for a notification tracker), not onto the invocation event.
      const manager = yield* ProcessManager.Service;
      const notify = { success: 'Done', error: 'Failed' };
      const handle = yield* manager.spawn(makeSumAggregator(), { notify });
      expect(handle.params.notify).toEqual(notify);
    }, Effect.provide(TestLayer)),
  );
});

// Minimal layer for durability tests: no auto-created ProcessManager; supplies raw deps.
const DurabilityTestLayer = Layer.mergeAll(
  Layer.succeed(ServiceResolver.ServiceResolver, ServiceResolver.empty),
  KeyValueStore.layerMemory,
  OperationHandlerSet.provide(handlers),
  Registry.layer,
  Trace.layerNoop,
);

describe('reentrancy', () => {
  it.effect(
    'shutdown and startup are idempotent',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const executable = makeSumAggregator();
      const handle = yield* manager.spawn(executable);
      yield* handle.runAndExit({ inputs: [1] }).pipe(Stream.runCollect);

      yield* manager.shutdown();
      yield* manager.shutdown();
      yield* manager.startup();
      yield* manager.startup();

      const dormant = yield* manager.list({ key: executable.key });
      const restored = yield* dormant[0].hydrate(executable);
      const outputs = yield* restored.runAndExit({ inputs: [2] }).pipe(Stream.runCollect);
      expect(Chunk.toReadonlyArray(outputs)).toEqual([3]);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'shutdown clears in-memory handles; startup exposes dormant processes from KV',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const executable = makeSumAggregator();
      const handle = yield* manager.spawn(executable);
      const pid = handle.pid;

      yield* handle.runAndExit({ inputs: [3] }).pipe(Stream.runCollect);
      yield* manager.shutdown();

      const attachExit = yield* manager.attach(pid).pipe(Effect.exit);
      expect(Exit.isFailure(attachExit)).toEqual(true);

      yield* manager.startup();

      const dormant = yield* manager.list({ key: executable.key });
      expect(dormant).toHaveLength(1);
      expect(dormant[0].pid).toEqual(pid);

      const restored = yield* dormant[0].hydrate(executable);
      const outputs = yield* restored.runAndExit({ inputs: [4] }).pipe(Stream.runCollect);
      expect(Chunk.toReadonlyArray(outputs)).toEqual([7]);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'concurrent shutdown and startup calls are serialized',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const executable = makeSumAggregator();
      yield* manager.spawn(executable);

      yield* Effect.all([manager.shutdown(), manager.startup(), manager.shutdown(), manager.startup()], {
        concurrency: 'unbounded',
        discard: true,
      });

      const dormant = yield* manager.list({ key: executable.key });
      expect(dormant).toHaveLength(1);
      const restored = yield* dormant[0].hydrate(executable);
      const outputs = yield* restored.runAndExit({ inputs: [1] }).pipe(Stream.runCollect);
      expect(Chunk.toReadonlyArray(outputs)).toEqual([1]);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'shutdown and startup with external hydrate resumes a hibernating alarm process',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const executable = makeWaitingExecutable();
      const handle = yield* manager.spawn(executable);
      expect(handle.status.state).toEqual(Process.State.HYBERNATING);

      yield* manager.shutdown();
      yield* manager.startup();

      const dormant = yield* manager.list({ key: executable.key });
      const restored = yield* dormant[0].hydrate(executable);
      expect(restored.status.state).toEqual(Process.State.HYBERNATING);

      yield* TestClock.adjust(Duration.millis(500));
      yield* restored.runToCompletion();
      expect(restored.status.state).toEqual(Process.State.SUCCEEDED);
    }, Effect.provide(TestLayer)),
  );
});

describe('durability', () => {
  const mkManager = (deps: {
    kv: KeyValueStore.KeyValueStore;
    registry: Registry.Registry;
    resolver: ServiceResolver.ServiceResolver;
    handlerSet: OperationHandlerSet.OperationHandlerSet;
    traceSink: Trace.Sink;
  }) =>
    new ProcessManager.ProcessManagerImpl({
      registry: deps.registry,
      kvStore: deps.kv,
      traceSink: deps.traceSink,
      serviceResolver: deps.resolver,
      handlerSet: deps.handlerSet,
      idGenerator: ProcessManager.UUIDProcessIdGenerator,
    });

  it.effect(
    'persists a spawned process record and clears it on terminate',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const registry = yield* Registry.AtomRegistry;
      const resolver = yield* ServiceResolver.ServiceResolver;
      const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
      const traceSink = yield* Trace.TraceSink;

      const waiting = makeWaitingExecutable();
      const manager = mkManager({ kv, registry, resolver, handlerSet, traceSink });

      const store = new ProcessStore(kv);

      const handle = yield* manager.spawn(waiting, { name: 'agent' });
      const persisted = yield* store.getProcess(handle.pid);
      expect(persisted?.key).toEqual('test.waiting');
      expect(persisted?.params.name).toEqual('agent');
      // The waiting process schedules a 500ms alarm in onSpawn.
      expect(persisted?.alarmDueAt).toBeGreaterThan(Date.now());

      yield* handle.terminate();
      expect(yield* store.getProcess(handle.pid)).toBeUndefined();
      expect(yield* store.listProcessIds()).not.toContain(handle.pid);
    }, Effect.provide(DurabilityTestLayer)),
  );

  it.effect(
    'hydrates a hibernating process and fires its alarm after restart',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const registry = yield* Registry.AtomRegistry;
      const resolver = yield* ServiceResolver.ServiceResolver;
      const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
      const traceSink = yield* Trace.TraceSink;

      const waiting = makeWaitingExecutable();
      const managerA = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const handle = yield* managerA.spawn(waiting);
      const pid = handle.pid;
      expect(handle.status.state).toEqual(Process.State.HYBERNATING);

      // Simulate app close BEFORE the alarm fires.
      yield* managerA.shutdown();

      // New manager over the same KV, explicit definition supplied at hydrate.
      const managerB = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const dormant = yield* managerB.list({ key: 'test.waiting' });
      const restored = yield* dormant[0].hydrate(waiting);
      expect(restored.status.state).toEqual(Process.State.HYBERNATING);

      // Alarm re-armed on the ambient Clock; advance TestClock to fire it.
      yield* TestClock.adjust(Duration.millis(500));
      yield* restored.runToCompletion();
      expect(restored.status.state).toEqual(Process.State.SUCCEEDED);

      // Record cleaned up after success.
      const store = new ProcessStore(kv);
      expect(yield* store.getProcess(pid)).toBeUndefined();
    }, Effect.provide(DurabilityTestLayer)),
  );

  it.effect(
    're-runs onSpawn only when its spawn event is still pending',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const registry = yield* Registry.AtomRegistry;
      const resolver = yield* ServiceResolver.ServiceResolver;
      const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
      const traceSink = yield* Trace.TraceSink;

      let spawnCount = 0;
      const counting = Process.make(
        { key: 'test.counting-spawn', input: Schema.Void, output: Schema.Void, services: [] },
        (ctx) =>
          Effect.succeed({
            onSpawn: () =>
              Effect.sync(() => {
                spawnCount++;
                ctx.setAlarm(10_000);
              }),
            onInput: () => Effect.void,
            onAlarm: () => Effect.void,
            onChildEvent: () => Effect.void,
          }),
      );
      const managerA = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const handle = yield* managerA.spawn(counting);
      expect(spawnCount).toEqual(1); // onSpawn ran, settled, spawn event removed.
      yield* managerA.shutdown();

      const managerB = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      yield* (yield* managerB.list({ key: 'test.counting-spawn' }))[0].hydrate(counting);
      // onSpawn NOT re-run because its event already settled; alarm re-armed instead.
      expect(spawnCount).toEqual(1);
      yield* (yield* managerB.attach(handle.pid)).terminate();
    }, Effect.provide(DurabilityTestLayer)),
  );

  it.effect(
    'hydrating parent redelivers interrupted alarm asynchronously',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const registry = yield* Registry.AtomRegistry;
      const resolver = yield* ServiceResolver.ServiceResolver;
      const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
      const traceSink = yield* Trace.TraceSink;

      const alarmStarted = yield* Deferred.make<void>();
      const alarmResume = yield* Deferred.make<void>();
      const alarmHandlerFinished = yield* Ref.make(false);
      const blockingParent = Process.make(
        {
          key: 'test.blocking-alarm-hydrate',
          input: Schema.Void,
          output: Schema.Void,
          services: [],
        },
        (ctx) =>
          Effect.succeed({
            onSpawn: () => Effect.void,
            onInput: () =>
              Effect.sync(() => {
                ctx.setAlarm(0);
              }),
            onAlarm: () =>
              Effect.gen(function* () {
                yield* Deferred.succeed(alarmStarted, undefined);
                yield* Deferred.await(alarmResume);
                yield* Ref.set(alarmHandlerFinished, true);
              }),
            onChildEvent: () => Effect.void,
          }),
      );

      const managerA = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const handle = yield* managerA.spawn(blockingParent);
      yield* handle.submitInput(undefined);
      yield* Deferred.await(alarmStarted);

      yield* managerA.shutdown();

      const store = new ProcessStore(kv);
      const parentRecord = yield* store.getProcess(handle.pid);
      expect(parentRecord?.events.map((event) => event._tag)).toContain('alarm');

      const managerB = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const dormant = yield* managerB.list({ key: blockingParent.key });
      expect(dormant).toHaveLength(1);

      // `hydrate` returns immediately; the unsettled alarm is redelivered on the process scope.
      yield* dormant[0].hydrate(blockingParent);
      yield* Deferred.await(alarmStarted);
      expect(yield* Ref.get(alarmHandlerFinished)).toEqual(false);

      yield* Deferred.succeed(alarmResume, undefined);
      yield* Effect.promise(() =>
        expect.poll(() => EffectEx.runAndForwardErrors(Ref.get(alarmHandlerFinished))).toEqual(true),
      );

      const restored = yield* managerB.attach(handle.pid);
      expect(restored.status.state).toEqual(Process.State.IDLE);
    }, Effect.provide(DurabilityTestLayer)),
  );

  it.effect(
    'hydrating parent redelivers interrupted alarm child asynchronously',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const registry = yield* Registry.AtomRegistry;
      const resolver = yield* ServiceResolver.ServiceResolver;
      const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
      const traceSink = yield* Trace.TraceSink;

      SlowChildGate.taskSignal = yield* Queue.unbounded<void>();
      SlowChildGate.completeDeferred = yield* Deferred.make<void>();
      SlowChildGate.alarmStarted = yield* Deferred.make<void>();
      SlowChildGate.alarmResume = yield* Deferred.make<void>();

      const parentExecutable = makeParentAwaitingChild();
      const childKey = DXN.getName(SlowChild.meta.key);

      const managerA = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const handle = yield* managerA.spawn(parentExecutable);
      yield* handle.submitInput(undefined);
      yield* Deferred.await(SlowChildGate.alarmStarted);
      const taskSignalA = SlowChildGate.taskSignal;
      yield* Queue.take(taskSignalA);

      yield* managerA.shutdown();

      const managerB = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const dormantParents = yield* managerB.list({ key: parentExecutable.key });
      expect(dormantParents).toHaveLength(1);

      const dormantChildren = yield* managerB.list({ key: childKey });
      expect(dormantChildren.length).toBeGreaterThanOrEqual(1);

      const alarmHandlerFinished = yield* Ref.make(false);
      SlowChildGate.alarmHandlerFinished = alarmHandlerFinished;

      yield* dormantParents[0].hydrate(parentExecutable);
      const taskSignalB = SlowChildGate.taskSignal;
      yield* Queue.take(taskSignalB);
      expect(yield* Ref.get(alarmHandlerFinished)).toEqual(false);

      yield* Deferred.succeed(SlowChildGate.alarmResume!, undefined);
      yield* Effect.promise(() =>
        expect.poll(() => EffectEx.runAndForwardErrors(Ref.get(alarmHandlerFinished))).toEqual(true),
      );

      const restored = yield* managerB.attach(handle.pid);
      expect(restored.status.state).toEqual(Process.State.SUCCEEDED);

      SlowChildGate.taskSignal = undefined;
      SlowChildGate.completeDeferred = undefined;
      SlowChildGate.alarmStarted = undefined;
      SlowChildGate.alarmResume = undefined;
      SlowChildGate.alarmHandlerFinished = undefined;
    }, Effect.provide(DurabilityTestLayer)),
  );

  it.effect(
    're-delivers an input whose handler never settled before shutdown',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const registry = yield* Registry.AtomRegistry;
      const resolver = yield* ServiceResolver.ServiceResolver;
      const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
      const traceSink = yield* Trace.TraceSink;

      let handled = 0;
      let gate = true; // first manager: block; after hydrate: allow.
      const blocking = Process.make(
        { key: 'test.blocking-input', input: Schema.String, output: Schema.Void, services: [] },
        () =>
          Effect.succeed({
            onSpawn: () => Effect.void,
            onInput: () =>
              Effect.gen(function* () {
                if (gate) {
                  yield* Effect.never;
                }
                handled++;
              }),
            onAlarm: () => Effect.void,
            onChildEvent: () => Effect.void,
          }),
      );
      const managerA = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const handle = yield* managerA.spawn(blocking);
      // Submit input and fork it (it will block forever in manager A).
      yield* Effect.fork(handle.submitInput('hello'));
      yield* Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 50)));
      yield* managerA.shutdown();

      gate = false; // allow handling after restart.
      const managerB = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      yield* (yield* managerB.list({ key: 'test.blocking-input' }))[0].hydrate(blocking);
      yield* Effect.promise(() => expect.poll(() => handled).toEqual(1));
      yield* (yield* managerB.attach(handle.pid)).terminate();
    }, Effect.provide(DurabilityTestLayer)),
  );

  it.effect(
    'fails a non-idempotent operation whose handler was interrupted before hydrate',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const registry = yield* Registry.AtomRegistry;
      const resolver = yield* ServiceResolver.ServiceResolver;
      const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
      const traceSink = yield* Trace.TraceSink;

      let gate = true;
      // No IdempotentAnnotation → treated as non-idempotent by `fromOperation`.
      const SlowOp = Operation.make({
        meta: { key: DXN.make('org.dxos.test.slowNonIdempotent'), name: 'SlowNonIdempotent' },
        input: Schema.Struct({ value: Schema.Number }),
        output: Schema.Void,
      });
      const opHandlers = OperationHandlerSet.make(
        SlowOp.pipe(
          Operation.withHandler(
            Effect.fn(function* () {
              if (gate) {
                yield* Effect.never;
              }
            }),
          ),
        ),
      );
      const opProcess = Process.fromOperation(SlowOp, opHandlers);
      const managerA = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const handle = yield* managerA.spawn(opProcess);
      // Submit input and let the handler enter the blocked section before shutdown.
      yield* Effect.fork(handle.submitInput({ value: 1 }));
      yield* Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 50)));
      yield* managerA.shutdown();

      // Restore: the operation observes its durable "started" marker → fails instead of retrying.
      gate = false;
      const managerB = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      yield* (yield* managerB.list({ key: opProcess.key }))[0].hydrate(opProcess);
      yield* Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 50)));
      const restoredHandle = yield* managerB.attach(handle.pid);
      expect(restoredHandle.status.state).toEqual(Process.State.FAILED);
    }, Effect.provide(DurabilityTestLayer)),
  );

  it.effect(
    'retries an idempotent operation whose handler was interrupted before hydrate',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const registry = yield* Registry.AtomRegistry;
      const resolver = yield* ServiceResolver.ServiceResolver;
      const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
      const traceSink = yield* Trace.TraceSink;

      let handled = 0;
      let gate = true;
      const idempotentAnnotations: Annotation.Dictionary = {};
      Annotation.setDictionary(idempotentAnnotations, Operation.IdempotentAnnotation, true);
      const SlowOp = Operation.make({
        meta: {
          key: DXN.make('org.dxos.test.slowIdempotent'),
          name: 'SlowIdempotent',
          annotations: idempotentAnnotations,
        },
        input: Schema.Struct({ value: Schema.Number }),
        output: Schema.Void,
      });
      const opHandlers = OperationHandlerSet.make(
        SlowOp.pipe(
          Operation.withHandler(
            Effect.fn(function* () {
              if (gate) {
                yield* Effect.never;
              }
              handled++;
            }),
          ),
        ),
      );
      const opProcess = Process.fromOperation(SlowOp, opHandlers);
      const managerA = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const handle = yield* managerA.spawn(opProcess);
      yield* Effect.fork(handle.submitInput({ value: 1 }));
      yield* Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 50)));
      yield* managerA.shutdown();

      // Restore: idempotent operations skip the marker and are simply re-run to completion.
      gate = false;
      const managerB = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      yield* (yield* managerB.list({ key: opProcess.key }))[0].hydrate(opProcess);
      yield* Effect.promise(() => expect.poll(() => handled).toEqual(1));
      const restoredHandle = yield* managerB.attach(handle.pid);
      expect(restoredHandle.status.state).toEqual(Process.State.SUCCEEDED);
    }, Effect.provide(DurabilityTestLayer)),
  );

  it.effect(
    'hydrate fails when the definition key does not match the persisted record',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const registry = yield* Registry.AtomRegistry;
      const resolver = yield* ServiceResolver.ServiceResolver;
      const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
      const traceSink = yield* Trace.TraceSink;

      const waiting = makeWaitingExecutable();
      const other = Process.make({ key: 'test.other', input: Schema.Void, output: Schema.Void, services: [] }, () =>
        Effect.succeed({
          onSpawn: () => Effect.void,
          onInput: () => Effect.void,
          onAlarm: () => Effect.void,
          onChildEvent: () => Effect.void,
        }),
      );
      const managerA = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const handle = yield* managerA.spawn(waiting);
      yield* managerA.shutdown();

      const managerB = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const dormant = yield* managerB.list({ key: 'test.waiting' });
      expect(dormant).toHaveLength(1);
      expect(dormant[0].pid).toEqual(handle.pid);
      const exit = yield* dormant[0].hydrate(other).pipe(Effect.exit);
      expect(Exit.isFailure(exit)).toBe(true);

      const store = new ProcessStore(kv);
      expect(yield* store.getProcess(handle.pid)).toBeDefined();
    }, Effect.provide(DurabilityTestLayer)),
  );

  it.effect(
    'terminal processes are not hydrated',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const registry = yield* Registry.AtomRegistry;
      const resolver = yield* ServiceResolver.ServiceResolver;
      const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
      const traceSink = yield* Trace.TraceSink;

      const opProcess = Process.fromOperation(Double, handlers);
      const managerA = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const handle = yield* managerA.spawn(opProcess);
      const outputs = yield* handle.runAndExit({ inputs: [{ value: 5 }] }).pipe(Stream.runCollect);
      expect(Chunk.toReadonlyArray(outputs)).toEqual([10]);
      expect(handle.status.state).toEqual(Process.State.SUCCEEDED);
      yield* managerA.shutdown();

      const managerB = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      expect(yield* managerB.list()).toHaveLength(0);

      const store = new ProcessStore(kv);
      expect(yield* store.listProcessIds()).toEqual([]);
    }, Effect.provide(DurabilityTestLayer)),
  );
});
