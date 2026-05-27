//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as KeyValueStore from '@effect/platform/KeyValueStore';
import { describe, it } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import {
  Operation,
  OperationHandlerSet,
  Process,
  ServiceNotAvailableError,
  ServiceResolver,
  Trace,
} from '@dxos/compute';
import * as StorageService from '@dxos/compute/StorageService';
import { Database } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { Organization } from '@dxos/types';

import * as ProcessManager from './ProcessManager';
import { TestDatabaseLayer } from './testing';

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

const Failing = Operation.make({
  meta: { key: 'org.dxos.test.failing', name: 'Failing' },
  input: Schema.Void,
  output: Schema.Void,
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
    'alarms',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(makeWaitingExecutable());
      {
        expect(handle.status.state).toEqual(Process.State.HYBERNATING);
      }
      {
        // Process stays HYBERNATING until the alarm fires; `runToCompletion` would block until SUCCEEDED.
        // Alarms use real `setTimeout`; `it.effect` uses TestClock, so `Effect.sleep` would not advance wall time.
        yield* Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 600)));
        expect(handle.status.state).toEqual(Process.State.SUCCEEDED);
      }
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
    meta: { key: 'org.dxos.test.invoker.child', name: 'Child' },
    input: Schema.Void,
    output: Schema.Struct({ spaceId: Schema.String }),
    services: [Database.Service],
  });

  // Operation that, from its own handler, invokes `ChildOp` and surfaces the
  // resulting spaceId so the test can compare it against the expected one.
  const ParentOp = Operation.make({
    meta: { key: 'org.dxos.test.invoker.parent', name: 'Parent' },
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
