//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Deferred from 'effect/Deferred';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as PubSub from 'effect/PubSub';
import * as Queue from 'effect/Queue';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as TestClock from 'effect/testing/TestClock';
import * as Tracer from 'effect/Tracer';
import * as KeyValueStore from 'effect/unstable/persistence/KeyValueStore';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import * as Rpc from 'effect/unstable/rpc/Rpc';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';

import { RUN_AGAIN_ERROR_CODE, RunAgainError, ServiceNotAvailableError } from '@dxos/compute';
import * as Cancellation from '@dxos/compute/Cancellation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Process from '@dxos/compute/Process';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as StorageService from '@dxos/compute/StorageService';
import * as Trace from '@dxos/compute/Trace';
import { Annotation, Database, DXN, Key } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Organization } from '@dxos/types';

import { ProcessStore } from './process-store';
import * as ProcessManager from './ProcessManager';
import * as ProcessMonitor from './ProcessMonitor';
import * as RemoteOperationInvoker from './RemoteOperationInvoker';
import * as RemoteProcessManager from './RemoteProcessManager';
import * as RemoteTraceMonitor from './RemoteTraceMonitor';
import { TestDatabaseLayer } from './testing';

//
// Test services (for unit tests without full ECHO stack).
//

//
// Operation definitions.
//

const Double = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.double'), name: 'Double' },
  input: Schema.Struct({ value: Schema.Number }),
  output: Schema.Number,
});

const Traced = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.traced'), name: 'Traced' },
  input: Schema.Void,
  output: Schema.Void,
});

const Failing = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.failing'), name: 'Failing' },
  input: Schema.Void,
  output: Schema.Void,
});

const RunAgain = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.runAgain'), name: 'RunAgain' },
  input: Schema.Void,
  output: Schema.Void,
});

// Carries an arbitrary live reference (e.g. a model/handle) that is not JSON-serializable.
const WithLiveRef = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.withLiveRef'), name: 'WithLiveRef' },
  input: Schema.Struct({ ref: Schema.Any }),
  output: Schema.Number,
});

/**
 * Child used by {@link ParentInvoker} to exercise the parent-child SUCCEEDED state invariant.
 */
const ChildPassthrough = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.childPassthrough'), name: 'ChildPassthrough' },
  input: Schema.Number,
  output: Schema.Number,
});

/**
 * Parent that invokes {@link ChildPassthrough} via `Operation.invoke` (blocking await).
 * Used to reproduce the DX-999 race where a late child-exit notification can clobber
 * a parent's SUCCEEDED status.
 */
const ParentInvoker = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.parentInvoker'), name: 'ParentInvoker' },
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
  alarmHandlerFinished: undefined as Deferred.Deferred<void> | undefined,
};

const SlowChild = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.slowChild'), name: 'SlowChild' },
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
  Traced.pipe(
    Operation.withHandler(
      Effect.fn(function* () {
        yield* Effect.void.pipe(Effect.withSpan('Handler.span'));
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
  RunAgain.pipe(
    Operation.withHandler(
      Effect.fn(function* () {
        return yield* Operation.runAgain();
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
        onInput: () => ctx.setAlarm(0),
        onAlarm: () =>
          Effect.gen(function* () {
            const invoker = yield* ProcessManager.ProcessOperationInvoker.Service;
            const { alarmStarted, alarmResume, alarmHandlerFinished } = SlowChildGate;
            if (alarmStarted === undefined || alarmResume === undefined || alarmHandlerFinished === undefined) {
              return yield* Effect.die('SlowChildGate alarm fields not initialized');
            }
            // Detach child invocation so the alarm handler can block on external completion,
            // matching agent-process awaiting an async tool call at shutdown.
            yield* Deferred.succeed(alarmStarted, undefined);
            yield* Effect.forkChild(invoker.invokeFiber(SlowChild, { value: 1 }).pipe(Effect.asVoid));
            yield* Deferred.await(alarmResume);
            yield* Deferred.succeed(alarmHandlerFinished, undefined);
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
            let acc = yield* StorageService.get(Schema.NumberFromString, 'acc').pipe(
              Effect.flatMap((value) => Effect.fromOption(value)),
              Effect.orDie,
            );
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
          yield* ctx.setAlarm(500);
        }),
      onInput: () => Effect.void,
      onAlarm: () =>
        Effect.gen(function* () {
          ctx.succeed();
        }),
      onChildEvent: () => Effect.void,
    }),
  );

/**
 * A process whose input handler ignores interruption. Terminating it leaves the scope pinned open —
 * the mid-turn cancel where the in-flight turn does not unwind — so the handle stays observable in
 * the window between "finished" and "torn down", which is where the wedged-chat bug lived.
 */
const makeStallingProcess = Effect.fnUntraced(function* () {
  const release = yield* Deferred.make<void>();
  const started = yield* Deferred.make<void>();
  let inputs = 0;
  const executable = Process.make({ key: 'test.stalling', input: Schema.Void, output: Schema.Void, services: [] }, () =>
    Effect.succeed({
      onSpawn: () => Effect.void,
      onInput: () =>
        Effect.gen(function* () {
          inputs++;
          yield* Deferred.succeed(started, undefined);
          yield* Deferred.await(release).pipe(Effect.uninterruptible);
        }),
      onAlarm: () => Effect.void,
      onChildEvent: () => Effect.void,
    }),
  );

  return { executable, release, started, inputs: () => inputs };
});

const rpcs = RpcGroup.make(
  Rpc.make('getValue', {
    success: Schema.Number,
  }),
  Rpc.make('setValue', {
    payload: Schema.Struct({ value: Schema.Number }),
    success: Schema.Void,
  }),
);

const ProcessWithRpcs = Process.make(
  {
    key: 'test.process-with-rpcs',
    input: Schema.Void,
    output: Schema.Void,
    services: [],
    rpcs,
  },
  (ctx) =>
    Effect.gen(function* () {
      const storage = yield* StorageService.StorageService;
      return {
        rpcHandlers: yield* rpcs.toHandlers({
          getValue: Effect.fn(function* () {
            return yield* storage.get(Schema.NumberFromString, 'acc').pipe(Effect.map(Option.getOrElse(() => 0)));
          }),
          setValue: Effect.fn(function* ({ value }) {
            yield* storage.set(Schema.NumberFromString, 'acc', value);
          }),
        }),
      };
    }),
);

const TestLayer = Layer.mergeAll(ProcessManager.ProcessOperationInvoker.layer, ProcessMonitor.layer).pipe(
  Layer.provideMerge(ProcessManager.layer({ idGenerator: ProcessManager.SequentialIdGenerator })),
  Layer.provideMerge(RemoteProcessManager.layerNoop),
  Layer.provideMerge(RemoteTraceMonitor.layerNoop),
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

// Trace messages captured by {@link CapturingTraceTestLayer}. Cleared at the start of each test that
// uses it (the sink closure holds this stable reference, so it must be mutated in place, not reassigned).
const capturedTraceMessages: Trace.Message[] = [];

// Variant of {@link TestLayer} whose {@link Trace.TraceSink} records every message for assertions.
const CapturingTraceTestLayer = Layer.mergeAll(ProcessManager.ProcessOperationInvoker.layer, ProcessMonitor.layer).pipe(
  Layer.provideMerge(ProcessManager.layer({ idGenerator: ProcessManager.SequentialIdGenerator })),
  Layer.provideMerge(RemoteProcessManager.layerNoop),
  Layer.provideMerge(RemoteTraceMonitor.layerNoop),
  Layer.provide(ServiceResolver.layerRequirements(Database.Service)),
  Layer.provide(TestDatabaseLayer({ types: [Organization.Organization] })),
  Layer.provide(KeyValueStore.layerMemory),
  Layer.provide(OperationHandlerSet.provide(handlers)),
  Layer.provideMerge(Registry.layer),
  Layer.provide(Layer.succeed(Trace.TraceSink, { write: (message) => capturedTraceMessages.push(message) })),
);

/**
 * Records the name of every span the ambient tracer is asked to open, delegating the span itself to
 * the built-in tracer. Stands in for the OTel-backed tracer the app installs: `Tracer.Tracer` is a
 * reference whose default builds in-memory spans that are never exported, so a handler that loses
 * the installed tracer still *looks* traced while emitting nothing.
 */
const makeRecordingTracer = (names: string[], spans: Tracer.Span[] = []) => {
  const base = Effect.runSync(Effect.tracer);
  return Tracer.make({
    span: (...args) => {
      names.push((args[0] as any).name);
      const span = base.span(...args);
      spans.push(span);
      return span;
    },
  });
};

/** Sets an alarm on input (or at spawn, when `atSpawn` is given) and opens a span when it fires. */
const makeTracedAlarmExecutable = (options: { atSpawn?: number; scheduleInSpan?: string } = {}) =>
  Process.make({ key: 'test.traced-alarm', input: Schema.Void, output: Schema.Void, services: [] }, (ctx) =>
    Effect.succeed({
      onSpawn: () => (options.atSpawn !== undefined ? ctx.setAlarm(options.atSpawn) : Effect.void),
      onInput: () =>
        options.scheduleInSpan ? ctx.setAlarm(0).pipe(Effect.withSpan(options.scheduleInSpan)) : ctx.setAlarm(0),
      onAlarm: () =>
        Effect.void.pipe(
          Effect.withSpan('Alarm.handler'),
          Effect.tap(() => Effect.sync(() => ctx.succeed())),
        ),
      onChildEvent: () => Effect.void,
    }),
  );

const spanNames: string[] = [];
const spaceSpans: Tracer.Span[] = [];
const alarmSpans: Tracer.Span[] = [];
const rearmSpanNames: string[] = [];

describe('ManagerImpl', () => {
  it.effect(
    'spawns a process and produces output',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;

      const executable = Process.fromOperation(Double, handlers);

      const handle = yield* manager.spawn(executable);
      expect(handle.pid).toBeDefined();

      const outputFiber = yield* Stream.runCollect(handle.subscribeOutputs()).pipe(Effect.forkChild);

      yield* handle.submitInput({ value: 5 });

      const outputs = yield* Fiber.join(outputFiber);
      expect(outputs).toEqual([10]);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'runs process handlers under the ambient tracer',
    Effect.fn(
      function* ({ expect }) {
        const manager = yield* ProcessManager.Service;
        const handle = yield* manager.spawn(Process.fromOperation(Traced, handlers));
        yield* handle.runAndExit({ inputs: [undefined] }).pipe(Stream.runCollect);
        expect(spanNames).toContain('Handler.span');
      },
      Effect.provide(TestLayer),
      Effect.provide(Layer.succeed(Tracer.Tracer, makeRecordingTracer(spanNames))),
    ),
  );

  it.effect(
    'stamps the process space on every span a handler opens',
    Effect.fn(
      function* ({ expect }) {
        const manager = yield* ProcessManager.Service;
        const handle = yield* manager.spawn(Process.fromOperation(Traced, handlers), {
          environment: { space: 'B7777777777777777777777777' as any },
        });
        yield* handle.runAndExit({ inputs: [undefined] }).pipe(Stream.runCollect);

        const span = spaceSpans.find(({ name }) => name === 'Handler.span');
        expect(span?.attributes.get('spaceId')).toEqual('B7777777777777777777777777');
      },
      Effect.provide(TestLayer),
      Effect.provide(Layer.succeed(Tracer.Tracer, makeRecordingTracer([], spaceSpans))),
    ),
  );

  it.effect(
    'runs an alarm handler outside the span that scheduled it',
    Effect.fn(
      function* ({ expect }) {
        const manager = yield* ProcessManager.Service;
        const handle = yield* manager.spawn(makeTracedAlarmExecutable({ scheduleInSpan: 'Input.span' }));
        yield* handle.submitInput(undefined);
        yield* handle.runToCompletion();

        // The agent schedules each turn from inside the previous one; were the alarm to inherit the
        // scheduling fiber's context, every turn would nest under the last, without end.
        const alarm = alarmSpans.find(({ name }) => name === 'Alarm.handler');
        expect(alarmSpans.some(({ name }) => name === 'Input.span')).toEqual(true);
        expect(alarm && Option.isNone(alarm.parent)).toEqual(true);
      },
      Effect.provide(TestLayer),
      Effect.provide(Layer.succeed(Tracer.Tracer, makeRecordingTracer([], alarmSpans))),
    ),
  );

  it.effect(
    'runs alarm-dispatched handlers under the ambient tracer',
    Effect.fn(
      function* ({ expect }) {
        const manager = yield* ProcessManager.Service;
        const handle = yield* manager.spawn(makeTracedAlarmExecutable());
        yield* handle.submitInput(undefined);
        yield* handle.runToCompletion();

        // The alarm timer is forked into the process scope from the fiber that set it, so the
        // handler it dispatches inherits that fiber's tracer instead of a detached fork's default.
        expect(spanNames).toContain('Alarm.handler');
      },
      Effect.provide(TestLayer),
      Effect.provide(Layer.succeed(Tracer.Tracer, makeRecordingTracer(spanNames))),
    ),
  );

  it.effect(
    'runs child-event handlers under the ambient tracer',
    Effect.fn(
      function* ({ expect }) {
        const manager = yield* ProcessManager.Service;
        const childExited = yield* Deferred.make<void>();
        const parent = yield* manager.spawn(
          Process.make({ key: 'test.traced-parent', input: Schema.Void, output: Schema.Void, services: [] }, () =>
            Effect.succeed({
              onChildEvent: () =>
                Effect.void.pipe(
                  Effect.withSpan('ChildEvent.handler'),
                  Effect.andThen(Deferred.succeed(childExited, undefined)),
                ),
            }),
          ),
        );
        const child = yield* manager.spawn(Process.fromOperation(Double, handlers), { parentProcessId: parent.pid });
        yield* child.runAndExit({ inputs: [{ value: 1 }] }).pipe(Stream.runCollect);
        yield* Deferred.await(childExited);

        expect(spanNames).toContain('ChildEvent.handler');
        yield* parent.terminate();
      },
      Effect.provide(TestLayer),
      Effect.provide(Layer.succeed(Tracer.Tracer, makeRecordingTracer(spanNames))),
    ),
  );

  it.effect(
    'runAndExit submits inputs and completes the stream at IDLE or SUCCEEDED',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(Process.fromOperation(Double, handlers));
      const outputs = yield* handle.runAndExit({ inputs: [{ value: 7 }] }).pipe(Stream.runCollect);
      expect(outputs).toEqual([14]);
      expect(handle.status.state).toEqual(Process.State.SUCCEEDED);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'runAndExit completes at IDLE for processes that stay alive after output',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(makeSumAggregator());
      const outputs = yield* handle.runAndExit({ inputs: [4] }).pipe(Stream.runCollect);
      expect(outputs).toEqual([4]);
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
    'terminate settles the handle even when a handler holds the process scope open',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const { executable, release, started } = yield* makeStallingProcess();

      const handle = yield* manager.spawn(executable);
      yield* handle.submitInput(undefined);
      yield* Deferred.await(started);
      const terminating = yield* Effect.forkChild(handle.terminate());
      yield* Effect.yieldNow;

      // The terminal state is visible while teardown is still blocked; a handle stuck in TERMINATING
      // reads as live and gets adopted by the next session, which then never receives a turn.
      expect(handle.status.state).toEqual(Process.State.TERMINATED);
      // ...and a caller waiting on the stop is released rather than held for the process's lifetime.
      yield* handle.runUntilSettled();

      yield* Deferred.succeed(release, undefined);
      yield* Fiber.join(terminating);
    }, Effect.provide(TestLayer)),
  );

  // The rest of the contract a stalled teardown has to keep. Each assertion is a state some consumer
  // reads while `terminate` is still blocked, and getting any of them wrong strands the caller
  // silently rather than failing it.
  it.effect(
    'a process stalled in teardown is not adoptable, and drops further input',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const { executable, release, started, inputs } = yield* makeStallingProcess();

      const handle = yield* manager.spawn(executable);
      yield* handle.submitInput(undefined);
      yield* Deferred.await(started);
      const terminating = yield* Effect.forkChild(handle.terminate());
      yield* Effect.yieldNow;

      // A remount lookup adopts the first process it finds in a non-terminal state. While teardown
      // blocks, this handle must not be that process.
      const listed = yield* manager.list({ key: 'test.stalling' });
      expect(listed.map((process) => process.status.state)).toEqual([Process.State.TERMINATED]);

      // Input after the stop is refused outright. Queueing it would be worse than dropping it: the
      // handler never runs again, so the caller would wait on a turn that cannot come.
      yield* handle.submitInput(undefined);
      expect(inputs()).toEqual(1);

      // Stopping twice returns rather than joining the blocked teardown behind the first caller.
      yield* handle.terminate();

      yield* Deferred.succeed(release, undefined);
      yield* Fiber.join(terminating);

      // Teardown completing neither revives the handle nor replays the dropped input.
      expect(handle.status.state).toEqual(Process.State.TERMINATED);
      expect(inputs()).toEqual(1);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'terminating a process cascades to its non-terminal children but not its terminated ones',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const parent = yield* manager.spawn(makeWaitingExecutable());
      const runningChild = yield* manager.spawn(makeWaitingExecutable(), { parentProcessId: parent.pid });
      const finishedChild = yield* manager.spawn(makeWaitingExecutable(), { parentProcessId: parent.pid });
      yield* finishedChild.terminate();
      expect(finishedChild.status.state).toEqual(Process.State.TERMINATED);

      yield* parent.terminate();
      expect(parent.status.state).toEqual(Process.State.TERMINATED);
      expect(runningChild.status.state).toEqual(Process.State.TERMINATED);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'terminate fires the run Cancellation signal',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const captured = yield* Deferred.make<AbortSignal>();
      const executable = Process.make(
        { key: 'test.cancellation', input: Schema.Void, output: Schema.Void, services: [] },
        () =>
          Effect.succeed({
            onSpawn: () =>
              Effect.gen(function* () {
                yield* Deferred.succeed(captured, yield* Cancellation.signal);
              }),
            onInput: () => Effect.void,
            onAlarm: () => Effect.void,
            onChildEvent: () => Effect.void,
          }),
      );
      const handle = yield* manager.spawn(executable);
      const signal = yield* Deferred.await(captured);
      expect(signal.aborted).toEqual(false);
      yield* handle.terminate();
      expect(signal.aborted).toEqual(true);
      expect(handle.status.state).toEqual(Process.State.TERMINATED);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'stateful',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(makeSumAggregator());
      // Forked before either input is submitted, so `Stream.take(2)` collects exactly the two outputs produced below.
      const outputsFiber = yield* handle.subscribeOutputs().pipe(Stream.take(2), Stream.runCollect, Effect.forkChild);
      {
        yield* handle.runToCompletion();
        expect(handle.status.state).toEqual(Process.State.IDLE);
      }
      {
        yield* handle.submitInput(1);
        yield* handle.submitInput(2);
        yield* handle.runToCompletion();
        expect(handle.status.state).toEqual(Process.State.IDLE);
        const outputs = yield* Fiber.join(outputsFiber);
        expect(outputs).toEqual([1, 3]);
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

  it.effect(
    'filters listed processes by parentProcessId, state, and target',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const executable = makeWaitingExecutable();
      const target = Key.URI.make('echo://BBBBBBBBBBBBBBBBBBBBBBBBBB/01JTESTTARGET000000000000');

      const parent = yield* manager.spawn(executable);
      const child = yield* manager.spawn(executable, { parentProcessId: parent.pid });
      const targeted = yield* manager.spawn(executable, { target });

      const childrenOfParent = yield* manager.list({ parentProcessId: parent.pid });
      expect(childrenOfParent.map((handle) => handle.pid)).toEqual([child.pid]);

      const hibernating = yield* manager.list({ state: Process.State.HYBERNATING });
      expect(new Set(hibernating.map((handle) => handle.pid))).toEqual(new Set([parent.pid, child.pid, targeted.pid]));
      const succeeded = yield* manager.list({ state: Process.State.SUCCEEDED });
      expect(succeeded).toEqual([]);

      const byTarget = yield* manager.list({ target });
      expect(byTarget.map((handle) => handle.pid)).toEqual([targeted.pid]);

      yield* parent.terminate();
      yield* child.terminate();
      yield* targeted.terminate();
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
        const [info] = tree;
        invariant(info);
        expect(info.pid).toEqual(handle.pid);
        expect(info.parentPid).toBeNull();
        expect(info.state).toEqual(Process.State.HYBERNATING);

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

    it.effect(
      'processTree serializes a FAILED process error from the underlying Error object',
      Effect.fn(function* ({ expect }) {
        const manager = yield* ProcessManager.Service;
        const monitor = yield* Process.ProcessMonitorService;
        const executable = Process.make(
          { key: 'test.explicit-fail', input: Schema.Void, output: Schema.Void, services: [] },
          (ctx) =>
            Effect.succeed({
              onSpawn: () => Effect.sync(() => ctx.fail(new Error('boom failure'))),
              onInput: () => Effect.void,
              onAlarm: () => Effect.void,
              onChildEvent: () => Effect.void,
            }),
        );

        const handle = yield* manager.spawn(executable);
        expect(handle.status.state).toEqual(Process.State.FAILED);

        const tree = yield* monitor.processTree;
        const info = tree.find((node) => node.pid === handle.pid);
        expect(info?.error?.name).toEqual('Error');
        expect(info?.error?.message).toEqual('boom failure');
        expect(info?.error?.stack).toContain('boom failure');
      }, Effect.provide(TestLayer)),
    );
  });

  it.effect(
    'runAndExit on successful operation',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(Process.fromOperation(Double, handlers));
      const outputs = yield* handle.runAndExit({ inputs: [{ value: 11 }] }).pipe(Stream.runCollect);
      expect(outputs).toEqual([22]);
      expect(handle.status.state).toEqual(Process.State.SUCCEEDED);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'parent process remains SUCCEEDED after child completes — requestChildEvent race (DX-999)',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;

      const handle = yield* manager.spawn(Process.fromOperation(ParentInvoker, handlers));
      const outputs = yield* handle.runAndExit({ inputs: [7] }).pipe(Stream.runCollect);
      expect(outputs).toEqual([7]);

      // Drain any background child-cleanup callbacks. Without the fix in
      // ProcessHandle.requestChildEvent, the late child-exit notification would
      // re-enter #runHandler after the parent set #finished=true, clobbering
      // SUCCEEDED with RUNNING and leaving the process permanently stuck.
      yield* Effect.yieldNow;
      yield* Effect.yieldNow;

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
      // Compared by defect rather than by deep-equal Exit: v4 annotates causes with a stack trace,
      // which a freshly-constructed `Exit.die` does not carry.
      expect(Result.getOrUndefined(Exit.findDefect(exit))).toEqual('Test Error');
      expect(handle.status.state).toEqual(Process.State.FAILED);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'runAndExit propagates the process failure cause without stringifying or nesting',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(Process.fromOperation(RunAgain, handlers));
      const exit = yield* handle.runAndExit({ inputs: [undefined] }).pipe(Stream.runCollect, Effect.exit);

      expect(Exit.isFailure(exit)).toBe(true);
      expect(handle.status.state).toEqual(Process.State.FAILED);

      if (!Exit.isFailure(exit)) {
        return;
      }

      const cause = exit.cause;
      expect(cause.reasons.some(Cause.isDieReason)).toBe(true);

      const defect = Cause.squash(cause);
      expect(typeof defect).not.toBe('string');
      expect(Cause.isCause(defect)).toBe(false);
      expect(RunAgainError.is(defect)).toBe(true);

      const processCause = handle.status.exit.pipe(Option.flatMap(Exit.getCause), Option.getOrUndefined);
      expect(processCause).toEqual(cause);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'runAgain tags the OperationEnd failure with the run-again error code',
    Effect.fn(function* ({ expect }) {
      capturedTraceMessages.length = 0;
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(Process.fromOperation(RunAgain, handlers));
      yield* handle.runAndExit({ inputs: [undefined] }).pipe(Stream.runCollect, Effect.exit);

      // `isOfType` inside the map narrows `event.data` to the OperationEnd payload without a cast.
      const ends = capturedTraceMessages
        .flatMap((message) => Trace.flatten(message))
        .flatMap((event) => (Trace.isOfType(Trace.OperationEnd, event) ? [event.data] : []));
      expect(ends).toHaveLength(1);
      expect(ends[0].outcome).toBe('failure');
      expect(ends[0].errorCode).toBe(RUN_AGAIN_ERROR_CODE);
    }, Effect.provide(CapturingTraceTestLayer)),
  );

  it.effect(
    'runAndExit on interrupted operation',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(makeWaitingExecutable());
      const collectFiber = yield* handle.runAndExit({ inputs: [] }).pipe(Stream.runCollect, Effect.forkChild);
      yield* Fiber.interrupt(collectFiber);
      const exit = yield* Fiber.join(collectFiber).pipe(Effect.exit);
      expect(Exit.isFailure(exit)).toEqual(true);
      if (Exit.isFailure(exit)) {
        expect(Cause.hasInterruptsOnly(exit.cause)).toEqual(true);
      }
    }, Effect.provide(TestLayer)),
  );
});

describe('rpcs', () => {
  it.effect(
    'spawn and use rpcs',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(ProcessWithRpcs);
      expect(yield* handle.rpc.getValue()).toEqual(0);
      yield* handle.rpc.setValue({ value: 20 });
      expect(yield* handle.rpc.getValue()).toEqual(20);
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
      expect(Result.getOrUndefined(Exit.findDefect(output))).toEqual('Test Error');
    }, Effect.provide(TestLayer)),
  );
});

//
// Edge dispatch: `InvokeOptions.on === 'edge'` routes through RemoteOperationInvoker instead of
// spawning a local process. Keyed by the operation's `meta.deployedId`.
//

describe('ProcessOperationInvoker edge dispatch', () => {
  const DeployedDouble = Operation.make({
    meta: {
      key: DXN.make('com.example.operation.test.deployedDouble'),
      name: 'DeployedDouble',
      deployedId: 'fn-double',
    },
    input: Schema.Struct({ value: Schema.Number }),
    output: Schema.Number,
  });

  const NotDeployed = Operation.make({
    meta: { key: DXN.make('com.example.operation.test.notDeployed'), name: 'NotDeployed' },
    input: Schema.Struct({ value: Schema.Number }),
    output: Schema.Number,
  });

  const makeEdgeLayer = (invoke: RemoteOperationInvoker.Invoker['invoke']) =>
    Layer.mergeAll(ProcessManager.ProcessOperationInvoker.layer, ProcessMonitor.layer).pipe(
      Layer.provideMerge(ProcessManager.layer({ idGenerator: ProcessManager.SequentialIdGenerator })),
      Layer.provideMerge(RemoteProcessManager.layerNoop),
      Layer.provideMerge(RemoteTraceMonitor.layerNoop),
      Layer.provideMerge(Layer.succeed(RemoteOperationInvoker.Service, { invoke })),
      Layer.provide(ServiceResolver.layerRequirements(Database.Service)),
      Layer.provide(TestDatabaseLayer({ types: [Organization.Organization] })),
      Layer.provide(KeyValueStore.layerMemory),
      Layer.provide(OperationHandlerSet.provide(handlers)),
      Layer.provideMerge(Registry.layer),
      Layer.provide(Trace.layerNoop),
    );

  it.effect(
    'routes on:edge invocations to the remote invoker keyed by deployedId',
    Effect.fn(function* ({ expect }) {
      const calls: Array<{ deployedId: string; input: unknown }> = [];
      const layer = makeEdgeLayer((_ctx, deployedId, input) => {
        calls.push({ deployedId, input });
        return Effect.succeed((input as { value: number }).value * 2) as Effect.Effect<never>;
      });

      const result = yield* Effect.gen(function* () {
        const invoker = yield* ProcessManager.ProcessOperationInvoker.Service;
        return yield* invoker.invoke(DeployedDouble, { value: 21 }, { on: 'edge' });
      }).pipe(Effect.provide(layer));

      expect(result).toEqual(42);
      expect(calls).toEqual([{ deployedId: 'fn-double', input: { value: 21 } }]);
    }),
  );

  it.effect(
    'does not spawn a local process for on:edge invocations',
    Effect.fn(function* ({ expect }) {
      const layer = makeEdgeLayer((_ctx, _deployedId, input) => Effect.succeed(input) as Effect.Effect<never>);

      const treeSize = yield* Effect.gen(function* () {
        const invoker = yield* ProcessManager.ProcessOperationInvoker.Service;
        yield* invoker.invoke(DeployedDouble, { value: 1 }, { on: 'edge' });
        const monitor = yield* Process.ProcessMonitorService;
        const tree = yield* monitor.processTree;
        return tree.length;
      }).pipe(Effect.provide(layer));

      expect(treeSize).toEqual(0);
    }),
  );

  it.effect(
    'dies on an edge invocation when the operation has no deployedId',
    Effect.fn(function* ({ expect }) {
      const layer = makeEdgeLayer((_ctx, _deployedId, input) => Effect.succeed(input) as Effect.Effect<never>);

      const exit = yield* Effect.gen(function* () {
        const invoker = yield* ProcessManager.ProcessOperationInvoker.Service;
        return yield* invoker.invoke(NotDeployed, { value: 1 }, { on: 'edge' });
      }).pipe(Effect.provide(layer), Effect.exit);

      expect(Exit.isFailure(exit)).toEqual(true);
    }),
  );

  it.effect(
    'dies on an edge invocation when no remote invoker is configured',
    Effect.fn(function* ({ expect }) {
      const exit = yield* Effect.gen(function* () {
        const invoker = yield* ProcessManager.ProcessOperationInvoker.Service;
        return yield* invoker.invoke(DeployedDouble, { value: 1 }, { on: 'edge' });
      }).pipe(Effect.provide(TestLayer), Effect.exit);

      expect(Exit.isFailure(exit)).toEqual(true);
    }),
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
    meta: { key: DXN.make('com.example.operation.test.invoker.child'), name: 'Child' },
    input: Schema.Void,
    output: Schema.Struct({ spaceId: Schema.String }),
    services: [Database.Service],
  });

  // Operation that, from its own handler, invokes `ChildOp` and surfaces the
  // resulting spaceId so the test can compare it against the expected one.
  const ParentOp = Operation.make({
    meta: { key: DXN.make('com.example.operation.test.invoker.parent'), name: 'Parent' },
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
            // Test-only coercion: an override may deliberately be a syntactically-plausible but
            // wrong space id to exercise the resolver's mismatch path, so `Key.SpaceId.make`
            // (which validates the format) is not usable here.
            input.override !== undefined ? { spaceId: input.override as Key.SpaceId } : undefined,
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
      // `succeed` ties the tag to `getService`'s return type, so `dbService` (already typed as
      // `Database.Service`'s shape) needs no cast to satisfy it.
      return ServiceResolver.succeed(Database.Service, (context) =>
        Effect.gen(function* () {
          if (context.space !== dbService.db.spaceId) {
            return yield* Effect.fail(
              new ServiceNotAvailableError(
                `Database.Service requires space context (got ${context.space ?? 'none'}, want ${dbService.db.spaceId})`,
              ),
            );
          }
          return dbService;
        }),
      );
    }),
  );

  const InheritanceTestLayer = Layer.mergeAll(ProcessManager.ProcessOperationInvoker.layer, ProcessMonitor.layer).pipe(
    Layer.provideMerge(ProcessManager.layer({ idGenerator: ProcessManager.SequentialIdGenerator })),
    Layer.provideMerge(RemoteProcessManager.layerNoop),
    Layer.provideMerge(RemoteTraceMonitor.layerNoop),
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

      const conversation = Key.URI.make('echo://BBBBBBBBBBBBBBBBBBBBBBBBBB/01JTESTCONVERSATION00000000');

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

          const event = yield* PubSub.take(events);
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
          expect(yield* PubSub.remaining(events)).toBe(0);
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
      expect(
        Option.getOrUndefined(Annotation.getDictionary(handle.params.annotations, Process.NotifyAnnotation)),
      ).toEqual(notify);
    }, Effect.provide(TestLayer)),
  );
});

describe('annotations', () => {
  it.effect(
    'surfaces spawn annotations on the handle and via list',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const handle = yield* manager.spawn(makeSumAggregator(), {
        annotations: Annotation.buildDictionary((dictionary) => {
          Annotation.setDictionary(dictionary, Process.HarnessHostAnnotation, true);
        }),
      });
      expect(Option.getOrNull(Annotation.getDictionary(handle.params.annotations, Process.HarnessHostAnnotation))).toBe(
        true,
      );
      const listed = yield* manager.list();
      expect(listed.some((process) => process.pid === handle.pid)).toBe(true);
      yield* handle.terminate();
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
      expect(outputs).toEqual([3]);
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
      expect(outputs).toEqual([7]);
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
      expect(outputs).toEqual([1]);
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'startup after shutdown resets the manager so a later shutdown suspends newly spawned processes',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const executable = makeSumAggregator();
      yield* manager.spawn(executable);
      yield* manager.shutdown();
      yield* manager.startup();

      // Spawned only after the reset, so this handle is only ever suspended by the SECOND shutdown below.
      const handle = yield* manager.spawn(executable);
      yield* manager.shutdown();

      const attachExit = yield* manager.attach(handle.pid).pipe(Effect.exit);
      expect(Exit.isFailure(attachExit)).toEqual(true);

      const dormant = yield* manager.list({ key: executable.key });
      expect(dormant.map((process) => process.pid)).toContain(handle.pid);
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

  // Rehydration rebuilds the process context, so the restored incarnation gets its own cancellation
  // controller. What must hold is the pairing: the restored handle's terminate has to fire the signal
  // the restored handler observes — otherwise the resumed run is uncancellable while a dead controller
  // is aborted instead. `suspend` (shutdown) must not fire either one; it is not a cancel.
  it.effect(
    'a rehydrated process is cancelled by its own Cancellation signal',
    Effect.fn(function* ({ expect }) {
      const manager = yield* ProcessManager.Service;
      const seen: AbortSignal[] = [];
      const executable = Process.make(
        { key: 'test.cancellation-rehydrate', input: Schema.Number, output: Schema.Void, services: [] },
        () =>
          Effect.succeed({
            onSpawn: () => Effect.void,
            onInput: () =>
              Effect.gen(function* () {
                seen.push(yield* Cancellation.signal);
              }),
            onAlarm: () => Effect.void,
            onChildEvent: () => Effect.void,
          }),
      );

      const handle = yield* manager.spawn(executable);
      yield* handle.submitInput(1);
      yield* handle.runToCompletion();

      yield* manager.shutdown();
      yield* manager.startup();
      const dormant = yield* manager.list({ key: executable.key });
      const restored = yield* dormant[0].hydrate(executable);
      yield* restored.submitInput(2);
      yield* restored.runToCompletion();

      expect(seen).toHaveLength(2);
      const [firstIncarnation, afterRehydrate] = seen;
      expect(afterRehydrate).not.toBe(firstIncarnation);
      // Shutdown suspended the process; neither controller fired.
      expect(firstIncarnation.aborted).toBe(false);
      expect(afterRehydrate.aborted).toBe(false);

      yield* restored.terminate();
      expect(afterRehydrate.aborted).toBe(true);
      expect(firstIncarnation.aborted).toBe(false);
    }, Effect.provide(TestLayer)),
  );
});

describe('durability', () => {
  const mkManager = (deps: {
    kv: KeyValueStore.KeyValueStore;
    registry: Registry.AtomRegistry;
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
    'fires a re-armed alarm under the ambient tracer after hydrate',
    Effect.fn(
      function* ({ expect }) {
        const kv = yield* KeyValueStore.KeyValueStore;
        const registry = yield* Registry.AtomRegistry;
        const resolver = yield* ServiceResolver.ServiceResolver;
        const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
        const traceSink = yield* Trace.TraceSink;

        const traced = makeTracedAlarmExecutable({ atSpawn: 500 });
        const managerA = mkManager({ kv, registry, resolver, handlerSet, traceSink });
        yield* managerA.spawn(traced);
        yield* managerA.shutdown();

        // Re-arming forks the timer from the hydrating fiber, so the handler runs under its tracer.
        const managerB = mkManager({ kv, registry, resolver, handlerSet, traceSink });
        const restored = yield* (yield* managerB.list({ key: 'test.traced-alarm' }))[0].hydrate(traced);
        yield* TestClock.adjust(Duration.millis(500));
        yield* restored.runToCompletion();

        expect(rearmSpanNames).toContain('Alarm.handler');
      },
      Effect.provide(DurabilityTestLayer),
      Effect.provide(Layer.succeed(Tracer.Tracer, makeRecordingTracer(rearmSpanNames))),
    ),
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
              Effect.gen(function* () {
                spawnCount++;
                yield* ctx.setAlarm(10_000);
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
            onInput: () => ctx.setAlarm(0),
            onAlarm: () =>
              Effect.gen(function* () {
                yield* Deferred.succeed(alarmStarted, undefined);
                yield* Deferred.await(alarmResume);
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

      // A `Deferred` remembers its outcome, so succeeding `alarmResume` before the redelivered
      // `onAlarm` ever awaits it is safe, and `runToCompletion` synchronizes on the process's
      // real status instead of racing a hand-rolled signal.
      const restored = yield* dormant[0].hydrate(blockingParent);
      yield* Deferred.succeed(alarmResume, undefined);
      yield* restored.runToCompletion();
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
      const alarmResume = yield* Deferred.make<void>();
      SlowChildGate.alarmResume = alarmResume;
      // The shared handler dies if this is undefined, on both the first run and the redelivered
      // one, so it must be set before the first `onAlarm` fires — unused otherwise now that the
      // final wait below synchronizes on the process's real status instead of a hand-rolled signal.
      SlowChildGate.alarmHandlerFinished = yield* Deferred.make<void>();

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

      const restored = yield* dormantParents[0].hydrate(parentExecutable);
      // Redelivery runs as a fork on the process scope; drain the scheduler so it actually
      // progresses before awaiting its result (same idiom as the DX-999 test above).
      yield* Effect.yieldNow.pipe(Effect.repeat({ times: 10 }));
      const taskSignalB = SlowChildGate.taskSignal;
      yield* Queue.take(taskSignalB);

      yield* Deferred.succeed(alarmResume, undefined);
      yield* restored.runToCompletion();
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
      const handledOnce = yield* Deferred.make<void>();
      const blocking = Process.make(
        { key: 'test.blocking-input', input: Schema.String, output: Schema.Void, services: [] },
        () =>
          Effect.succeed({
            onSpawn: () => Effect.void,
            onInput: () =>
              Effect.gen(function* () {
                if (gate) {
                  return yield* Effect.never;
                }
                handled++;
                yield* Deferred.succeed(handledOnce, undefined);
              }),
            onAlarm: () => Effect.void,
            onChildEvent: () => Effect.void,
          }),
      );
      const managerA = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const handle = yield* managerA.spawn(blocking);
      // `submitInput` returns once the input is durably persisted, without waiting on the handler,
      // so awaiting it already guarantees the input is pending before shutdown.
      yield* handle.submitInput('hello');
      yield* managerA.shutdown();

      gate = false; // allow handling after restart.
      const managerB = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      yield* (yield* managerB.list({ key: 'test.blocking-input' }))[0].hydrate(blocking);
      // Redelivery runs as a fork on the process scope; drain the scheduler so it actually
      // progresses before awaiting its result (same idiom as the DX-999 test above).
      yield* Effect.yieldNow.pipe(Effect.repeat({ times: 10 }));
      yield* Deferred.await(handledOnce);
      expect(handled).toEqual(1);
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
        meta: { key: DXN.make('com.example.operation.test.slowNonIdempotent'), name: 'SlowNonIdempotent' },
        input: Schema.Struct({ value: Schema.Number }),
        output: Schema.Void,
      });
      const opHandlers = OperationHandlerSet.make(
        SlowOp.pipe(
          Operation.withHandler(
            Effect.fn(function* () {
              if (gate) {
                return yield* Effect.never;
              }
            }),
          ),
        ),
      );
      const opProcess = Process.fromOperation(SlowOp, opHandlers);
      const managerA = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const handle = yield* managerA.spawn(opProcess);
      // `submitInput` returns once the input and the operation's durable "started" marker are
      // persisted, without waiting on the handler, so awaiting it already captures both before shutdown.
      yield* handle.submitInput({ value: 1 });
      yield* managerA.shutdown();

      // Restore: the operation observes its durable "started" marker → fails instead of retrying.
      gate = false;
      const managerB = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const restoredHandle = yield* (yield* managerB.list({ key: opProcess.key }))[0].hydrate(opProcess);
      // Redelivery runs as a fork on the process scope; drain the scheduler so it actually
      // progresses before awaiting its result (same idiom as the DX-999 test above).
      yield* Effect.yieldNow.pipe(Effect.repeat({ times: 10 }));
      const exit = yield* restoredHandle.runToCompletion().pipe(Effect.exit);
      expect(Exit.isFailure(exit)).toBe(true);
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
      const handledOnce = yield* Deferred.make<void>();
      const idempotentAnnotations: Annotation.Dictionary = {};
      Annotation.setDictionary(idempotentAnnotations, Operation.IdempotentAnnotation, true);
      const SlowOp = Operation.make({
        meta: {
          key: DXN.make('com.example.operation.test.slowIdempotent'),
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
                return yield* Effect.never;
              }
              handled++;
              yield* Deferred.succeed(handledOnce, undefined);
            }),
          ),
        ),
      );
      const opProcess = Process.fromOperation(SlowOp, opHandlers);
      const managerA = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const handle = yield* managerA.spawn(opProcess);
      // See the sibling durability test above for why a plain, non-forked `submitInput` already
      // guarantees the pending input is durably captured before shutdown.
      yield* handle.submitInput({ value: 1 });
      yield* managerA.shutdown();

      // Restore: idempotent operations skip the marker and are simply re-run to completion.
      gate = false;
      const managerB = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const restoredHandle = yield* (yield* managerB.list({ key: opProcess.key }))[0].hydrate(opProcess);
      // Redelivery runs as a fork on the process scope; drain the scheduler so it actually
      // progresses before awaiting its result (same idiom as the DX-999 test above).
      yield* Effect.yieldNow.pipe(Effect.repeat({ times: 10 }));
      yield* Deferred.await(handledOnce);
      expect(handled).toEqual(1);
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
    'hydrate returns a live handle; the dormant view stays inert',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const registry = yield* Registry.AtomRegistry;
      const resolver = yield* ServiceResolver.ServiceResolver;
      const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
      const traceSink = yield* Trace.TraceSink;

      const waiting = makeWaitingExecutable();
      const managerA = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const handle = yield* managerA.spawn(waiting);
      yield* managerA.shutdown();

      const managerB = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const [dormant] = yield* managerB.list({ key: 'test.waiting' });

      // The dormant view is read-only: callers must use what `hydrate` returns, not the listed
      // handle (the AgentService regression that surfaced as "Process not hydrated" on submit).
      const live = yield* dormant.hydrate(waiting);
      expect(live).not.toBe(dormant);
      expect(live.pid).toEqual(handle.pid);
      yield* live.submitInput(undefined);
      expect(Exit.isFailure(yield* dormant.submitInput(undefined).pipe(Effect.exit))).toBe(true);

      // Hydrating again is idempotent — it returns the same live handle.
      expect(yield* dormant.hydrate(waiting)).toBe(live);
    }, Effect.provide(DurabilityTestLayer)),
  );

  it.effect(
    'terminating a dormant handle discards the record and its descendants',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const registry = yield* Registry.AtomRegistry;
      const resolver = yield* ServiceResolver.ServiceResolver;
      const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
      const traceSink = yield* Trace.TraceSink;

      const waiting = makeWaitingExecutable();
      const managerA = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const parent = yield* managerA.spawn(waiting);
      const child = yield* managerA.spawn(waiting, { parentProcessId: parent.pid });
      yield* managerA.shutdown();

      const managerB = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const dormantParent = (yield* managerB.list({ key: 'test.waiting' })).find(
        (listed) => listed.pid === parent.pid,
      )!;

      // Discarding a stale process must not require booting it first.
      yield* dormantParent.terminate();

      expect(yield* managerB.list({ key: 'test.waiting' })).toHaveLength(0);
      const store = new ProcessStore(kv);
      expect(yield* store.getProcess(parent.pid)).toBeUndefined();
      expect(yield* store.getProcess(child.pid)).toBeUndefined();
    }, Effect.provide(DurabilityTestLayer)),
  );

  it.effect(
    'discarding a handle hydrated since the listing still sweeps its dormant descendants',
    Effect.fn(function* ({ expect }) {
      const kv = yield* KeyValueStore.KeyValueStore;
      const registry = yield* Registry.AtomRegistry;
      const resolver = yield* ServiceResolver.ServiceResolver;
      const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
      const traceSink = yield* Trace.TraceSink;

      const waiting = makeWaitingExecutable();
      const managerA = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const parent = yield* managerA.spawn(waiting);
      const child = yield* managerA.spawn(waiting, { parentProcessId: parent.pid });
      yield* managerA.shutdown();

      const managerB = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      const dormantParent = (yield* managerB.list({ key: 'test.waiting' })).find(
        (listed) => listed.pid === parent.pid,
      )!;

      // Another caller hydrates the parent between the listing and the discard. Live termination
      // only visits children in the handle map, so the still-dormant child would survive.
      yield* dormantParent.hydrate(waiting);
      yield* dormantParent.terminate();

      const store = new ProcessStore(kv);
      expect(yield* store.getProcess(parent.pid)).toBeUndefined();
      expect(yield* store.getProcess(child.pid)).toBeUndefined();
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
      expect(outputs).toEqual([10]);
      expect(handle.status.state).toEqual(Process.State.SUCCEEDED);
      yield* managerA.shutdown();

      const managerB = mkManager({ kv, registry, resolver, handlerSet, traceSink });
      expect(yield* managerB.list()).toHaveLength(0);

      const store = new ProcessStore(kv);
      expect(yield* store.listProcessIds()).toEqual([]);
    }, Effect.provide(DurabilityTestLayer)),
  );
});
