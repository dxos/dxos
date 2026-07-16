//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as KeyValueStore from '@effect/platform/KeyValueStore';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { Operation, OperationHandlerSet, ServiceResolver, Trace, Trigger, type TriggerEvent } from '@dxos/compute';
import * as ProcessManager from './ProcessManager';
import { ExampleHandlers, Reply } from '@dxos/compute/testing';
import { Database, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { credentialsLayerConfig } from './services/credentials';
import { invariant } from '@dxos/invariant';
import { Person } from '@dxos/types';

import { TriggerDispatcher } from './triggers/trigger-dispatcher';
import * as RemoteTriggerManager from './RemoteTriggerManager';
import * as TriggerMonitor from './TriggerMonitor';
import { TriggerStateStore } from './triggers/trigger-state-store';

/**
 * Environment providing the {@link TriggerMonitorLayer}'s dependencies
 * ({@link TriggerDispatcher}, {@link Database.Service}, {@link Registry.AtomRegistry}).
 * The monitor itself is built per-test via {@link withMonitor} so that its initial
 * state derivation observes triggers seeded by the test body.
 */
const TestLayer = (options: { timeControl?: 'natural' | 'manual'; startingTime?: Date } = {}) =>
  Layer.empty.pipe(
    Layer.provideMerge(
      TriggerDispatcher.layer({
        timeControl: options.timeControl ?? 'manual',
        startingTime: options.startingTime ?? new Date('2025-09-05T15:01:00.000Z'),
      }),
    ),
    Layer.provide(TriggerStateStore.layerMemory),
    Layer.provideMerge(RemoteTriggerManager.layerNoop),
    Layer.provideMerge(AiService.notAvailable),
    Layer.provideMerge(credentialsLayerConfig([])),
    Layer.provideMerge(FetchHttpClient.layer),
    Layer.provideMerge(ProcessManager.layer({ idGenerator: ProcessManager.SequentialIdGenerator })),
    Layer.provideMerge(ServiceResolver.layerRequirements(Database.Service)),
    Layer.provideMerge(
      TestDatabaseLayer({
        types: [Operation.PersistentOperation, Trigger.Trigger, Person.Person],
      }),
    ),
    Layer.provideMerge(KeyValueStore.layerMemory),
    Layer.provideMerge(OperationHandlerSet.provide(ExampleHandlers)),
    Layer.provideMerge(Registry.layer),
    Layer.provideMerge(Trace.layerNoop),
  );

/**
 * Store an operation definition in the in-process registry so a trigger's runnable ref resolves.
 */
const registerOperation = (operation: Operation.Definition.Any) =>
  Effect.gen(function* () {
    const record = Operation.serialize(operation);
    const { db } = yield* Database.Service;
    db.registry.add([record]);
    return record;
  });

/**
 * Build the {@link Trigger.TriggerMonitorService} on top of the already-provided dependencies and
 * run `body` with it. Building here (rather than in the top-level layer) means the monitor's initial
 * synchronous state derivation observes whatever triggers the test body seeded beforehand. A no-op
 * subscription keeps the derived atom mounted so writes are retained for `registry.get` reads.
 */
const withMonitor = <A, E, R>(body: (monitor: Trigger.Monitor) => Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const monitor = yield* Trigger.TriggerMonitorService;
    const registry = yield* Registry.AtomRegistry;
    yield* Effect.acquireRelease(
      Effect.sync(() => registry.subscribe(monitor.triggers, () => {})),
      (unsubscribe) => Effect.sync(unsubscribe),
    );
    return yield* body(monitor);
  }).pipe(Effect.provide(TriggerMonitor.layer), Effect.scoped);

describe('TriggerMonitor', () => {
  it.effect(
    'reports enabled local triggers with their cron schedule',
    Effect.fnUntraced(function* ({ expect }) {
      const functionObj = yield* registerOperation(Reply);
      const trigger = Trigger.make({
        runnable: Ref.make(functionObj),
        enabled: true,
        spec: Trigger.specTimer('*/5 * * * *'),
      });
      yield* Database.add(trigger);

      // Populate the dispatcher's runtime state (cron schedule) before deriving monitor state.
      const dispatcher = yield* TriggerDispatcher;
      yield* dispatcher.refreshTriggers();

      const registry = yield* Registry.AtomRegistry;
      yield* withMonitor((monitor) =>
        Effect.sync(() => {
          const states = registry.get(monitor.triggers);
          expect(states.length).toBe(1);
          const [state] = states;
          expect(state.trigger.target?.id).toBe(trigger.id);
          expect(state.environment).toBe('local');
          expect(state.nextExecution).toBeInstanceOf(Date);
          expect(state.cooldownUntil).toBeUndefined();
          expect(state.retry).toBeUndefined();
          expect(state.lastResult).toBeNull();
        }),
      );
    }, Effect.provide(TestLayer())),
  );

  it.effect(
    'omits disabled triggers',
    Effect.fnUntraced(function* ({ expect }) {
      const functionObj = yield* registerOperation(Reply);
      const enabledTrigger = Trigger.make({
        runnable: Ref.make(functionObj),
        enabled: true,
        spec: Trigger.specTimer('* * * * *'),
      });
      const disabledTrigger = Trigger.make({
        runnable: Ref.make(functionObj),
        enabled: false,
        spec: Trigger.specTimer('* * * * *'),
      });
      yield* Database.add(enabledTrigger);
      yield* Database.add(disabledTrigger);

      const registry = yield* Registry.AtomRegistry;
      yield* withMonitor((monitor) =>
        Effect.sync(() => {
          const states = registry.get(monitor.triggers);
          expect(states.length).toBe(1);
          expect(states[0].trigger.target?.id).toBe(enabledTrigger.id);
        }),
      );
    }, Effect.provide(TestLayer())),
  );

  it.effect(
    'reports remote triggers as running on the edge',
    Effect.fnUntraced(function* ({ expect }) {
      const functionObj = yield* registerOperation(Reply);
      const trigger = Trigger.make({
        runnable: Ref.make(functionObj),
        enabled: true,
        remote: true,
        spec: Trigger.specTimer('*/5 * * * *'),
      });
      yield* Database.add(trigger);

      const registry = yield* Registry.AtomRegistry;
      yield* withMonitor((monitor) =>
        Effect.sync(() => {
          const states = registry.get(monitor.triggers);
          expect(states.length).toBe(1);
          const [state] = states;
          expect(state.trigger.target?.id).toBe(trigger.id);
          expect(state.environment).toBe('edge');
        }),
      );
    }, Effect.provide(TestLayer())),
  );

  it.effect(
    'localDispatcherEnabled reflects the dispatcher running state',
    Effect.fnUntraced(
      function* ({ expect }) {
        const dispatcher = yield* TriggerDispatcher;
        yield* withMonitor((monitor) =>
          Effect.gen(function* () {
            expect(monitor.localDispatcherEnabled).toBe(false);

            yield* dispatcher.start();
            expect(monitor.localDispatcherEnabled).toBe(true);

            yield* dispatcher.stop();
            expect(monitor.localDispatcherEnabled).toBe(false);
          }),
        );
      },
      Effect.provide(TestLayer({ timeControl: 'natural' })),
    ),
  );

  it.effect(
    'invokeTrigger delegates to the dispatcher',
    Effect.fnUntraced(function* ({ expect }) {
      const functionObj = yield* registerOperation(Reply);
      const trigger = Trigger.make({
        runnable: Ref.make(functionObj),
        enabled: true,
        spec: Trigger.specDirect(),
      });
      yield* Database.add(trigger);

      const dispatcher = yield* TriggerDispatcher;
      const registry = yield* Registry.AtomRegistry;
      yield* withMonitor((monitor) =>
        Effect.gen(function* () {
          yield* monitor.invokeTrigger({
            trigger,
            event: { data: { tick: 7 } } satisfies TriggerEvent.DirectEvent,
          });

          // The monitor forwards to `dispatcher.invokeTrigger`, so the dispatcher records the
          // invocation and publishes its result as the trigger's runtime status `lastResult`.
          const dispatcherState = registry.get(dispatcher.state);
          expect(dispatcherState.invocations.some((entry) => entry.trigger.id === trigger.id)).toBe(true);
          const status = dispatcherState.triggers.find((entry) => entry.triggerId === trigger.id);
          invariant(status?.lastResult, 'expected the invocation to publish a last result');
          expect(Exit.isSuccess(status.lastResult)).toBe(true);
          expect(status.lastResult).toEqual(Exit.succeed({ data: { tick: 7 } }));
        }),
      );
    }, Effect.provide(TestLayer())),
  );

  it.effect(
    'reactively re-derives state when the dispatcher changes',
    Effect.fnUntraced(function* ({ expect }) {
      const dispatcher = yield* TriggerDispatcher;
      const registry = yield* Registry.AtomRegistry;
      yield* withMonitor((monitor) =>
        Effect.gen(function* () {
          // No triggers seeded before the monitor was built: the initial derivation is empty.
          expect(registry.get(monitor.triggers).length).toBe(0);

          // Seed a trigger, then poke the dispatcher so its state changes and the monitor
          // subscription re-derives. The re-derivation runs asynchronously, so poll for it.
          const functionObj = yield* registerOperation(Reply);
          const trigger = Trigger.make({
            runnable: Ref.make(functionObj),
            enabled: true,
            spec: Trigger.specTimer('*/5 * * * *'),
          });
          yield* Database.add(trigger);
          yield* dispatcher.refreshTriggers();

          // The subscription re-derives on the default runtime via `Effect.runPromise`, so poll in
          // real time (bounded to ~3s). `it.effect` installs a `TestClock`, so `Effect.sleep` would
          // never advance here; `setTimeout` waits against the wall clock instead.
          const waitReal = Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 20)));
          for (let attempt = 0; attempt < 150 && registry.get(monitor.triggers).length === 0; attempt++) {
            yield* waitReal;
          }

          const states = registry.get(monitor.triggers);
          expect(states.length).toBe(1);
          expect(states[0].trigger.target?.id).toBe(trigger.id);
          expect(states[0].environment).toBe('local');
        }),
      );
    }, Effect.provide(TestLayer())),
  );
});
