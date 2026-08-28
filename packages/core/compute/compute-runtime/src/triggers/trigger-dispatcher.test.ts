//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import * as KeyValueStore from 'effect/unstable/persistence/KeyValueStore';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { AiService } from '@dxos/ai';
import { ServiceNotAvailableError } from '@dxos/compute';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Runnable from '@dxos/compute/Runnable';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { ExampleHandlers, Reply } from '@dxos/compute/testing';
import * as Trace from '@dxos/compute/Trace';
import * as Trigger from '@dxos/compute/Trigger';
import * as TriggerEvent from '@dxos/compute/TriggerEvent';
import { Annotation, Database, DXN, Feed, Filter, Obj, Query, Ref, Scope, Type } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { invariant } from '@dxos/invariant';
import { Person, Task } from '@dxos/types';

import * as ProcessManager from '../ProcessManager';
import { credentialsLayerConfig } from '../services/credentials';
import { LEGACY_KEY_FEED_CURSOR, TriggerDispatcher } from './trigger-dispatcher';
import { TriggerStateStore } from './trigger-state-store';

/**
 * Strict resolver that mimics the production {@link LayerStack}: refuses
 * to materialise space-affinity services unless the caller supplies a
 * matching `space` in the {@link ServiceResolver.ResolutionContext}.
 *
 * Built lazily once `Database.Service` is available so the resolver can
 * tie itself to the live test database's `spaceId`.
 */
const SpaceAwareResolverLayer = Layer.effect(
  ServiceResolver.ServiceResolver,
  Effect.gen(function* () {
    const dbService = yield* Database.Service;
    return ServiceResolver.succeed(Database.Service, (context) =>
      context.space === dbService.db.spaceId
        ? Effect.succeed(dbService)
        : Effect.fail(
            new ServiceNotAvailableError(
              `Database.Service requires space context (got ${context.space ?? 'none'}, want ${dbService.db.spaceId})`,
            ),
          ),
    );
  }),
);

/**
 * Operation whose handler depends on {@link Database.Service}. Resolved via the
 * operation handler set registered with {@link OperationHandlerSet.provide} below.
 */
const ProbeOp = Operation.make({
  meta: { key: DXN.make('com.example.operation.triggerDispatcher.probeDatabase'), name: 'Probe Database' },
  input: Schema.Any,
  output: Schema.Struct({ spaceId: Schema.String }),
  services: [Database.Service],
});

class RetryCounter extends Type.makeObject<RetryCounter>(
  DXN.make('com.example.operation.triggerDispatcher.retryCounter', '0.1.0'),
)(
  Schema.Struct({
    count: Schema.Number,
  }),
) {}

const RetryOp = Operation.make({
  meta: { key: DXN.make('com.example.operation.triggerDispatcher.retry'), name: 'Retry' },
  input: Schema.Void,
  output: Schema.Void,
  services: [Database.Service],
});

/**
 * Receives a raw subscription event, resolves `event.subject`, and echoes the mutation type plus the
 * resolved object's id — used to assert `subject` dereferences to the mutated object.
 */
const SubjectProbeOp = Operation.make({
  meta: { key: DXN.make('com.example.operation.triggerDispatcher.subjectProbe'), name: 'Subject Probe' },
  input: Schema.Any,
  output: Schema.Struct({ type: Schema.String, subjectId: Schema.optional(Schema.String) }),
  services: [Database.Service],
});

const TestHanlers = OperationHandlerSet.make(
  SubjectProbeOp.pipe(
    Operation.withHandler(
      Effect.fn(function* (event: TriggerEvent.SubscriptionEvent) {
        const resolved = yield* Effect.orElseSucceed(
          Effect.promise(() => event.subject.tryLoad()),
          () => undefined,
        );
        return { type: event.type, subjectId: resolved?.id };
      }),
    ),
  ),
  ProbeOp.pipe(
    Operation.withHandler(
      Effect.fn(function* () {
        const { db } = yield* Database.Service;
        return { spaceId: db.spaceId };
      }),
    ),
  ),
  RetryOp.pipe(
    Operation.withHandler(
      Effect.fn(function* () {
        const counter = yield* Database.query(Filter.type(RetryCounter)).first.pipe(
          Effect.flatMap((result) => Effect.fromOption(result)),
          Effect.catchTag('NoSuchElementError', () => Database.add(Obj.make(RetryCounter, { count: 0 }))),
        );
        if (counter.count >= 3) {
          return;
        }

        Obj.update(counter, (counter) => {
          counter.count++;
        });
        return yield* Operation.runAgain();
      }),
    ),
  ),
);

/** Full environment for trigger tests; cast so `it.effect` accepts the provided service union. */
const TestLayer = (
  options: {
    timeControl?: 'natural' | 'manual';
    startingTime?: Date;
    failureCooldown?: Duration.Duration;
    livePollInterval?: Duration.Duration;
    spaceAwareResolver?: boolean;
  } = {},
) =>
  Layer.empty.pipe(
    Layer.provideMerge(
      TriggerDispatcher.layer({
        timeControl: options.timeControl ?? 'manual',
        startingTime: options.startingTime ?? new Date('2025-09-05T15:01:00.000Z'),
        failureCooldown: options.failureCooldown,
        // A sub-minute schedule is refused against the 1-minute default, so a test wanting one says
        // so here — the same knob production would have to turn to allow it.
        livePollInterval: options.livePollInterval,
      }),
    ),
    Layer.provide(TriggerStateStore.layerMemory),
    Layer.provideMerge(AiService.notAvailable),
    Layer.provideMerge(credentialsLayerConfig([])),
    Layer.provideMerge(FetchHttpClient.layer),
    Layer.provideMerge(ProcessManager.layer({ idGenerator: ProcessManager.SequentialIdGenerator })),
    Layer.provideMerge(
      options.spaceAwareResolver ? SpaceAwareResolverLayer : ServiceResolver.layerRequirements(Database.Service),
    ),
    Layer.provideMerge(
      TestDatabaseLayer({
        types: [Operation.PersistentOperation, Trigger.Trigger, Person.Person, Task.Task, RetryCounter],
      }),
    ),
    Layer.provideMerge(KeyValueStore.layerMemory),
    Layer.provideMerge(OperationHandlerSet.provide(OperationHandlerSet.merge(ExampleHandlers, TestHanlers))),
    Layer.provideMerge(Registry.layer),
    Layer.provideMerge(Trace.layerNoop),
  );

/**
 * Store an operation definition in the database registry rather than persisting it to the
 * database. The dispatcher resolves the trigger's function ref transparently from the registry.
 */
const registerOperation = (operation: Operation.Definition.Any) =>
  Effect.gen(function* () {
    const record = Operation.serialize(operation);
    const { db } = yield* Database.Service;
    db.registry.add([record]);
    return record;
  });

describe('TriggerDispatcher', () => {
  describe('Time Control', () => {
    it.effect(
      'should get current time based on time control',
      Effect.fnUntraced(function* ({ expect }) {
        const dispatcher = yield* TriggerDispatcher;

        const initialTime = dispatcher.getCurrentTime();

        // Advance time by 1 hour
        yield* dispatcher.advanceTime(Duration.hours(1));

        const newTime = dispatcher.getCurrentTime();
        const timeDiff = newTime.getTime() - initialTime.getTime();

        expect(timeDiff).toBe(Duration.toMillis(Duration.hours(1)));
      }, Effect.provide(TestLayer())),
    );
  });

  describe('Manual Invocation', () => {
    it.effect(
      'should invoke manual trigger with caller-provided data',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = yield* registerOperation(Reply);
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specDirect(),
        });
        yield* Database.add(trigger);
        const dispatcher = yield* TriggerDispatcher;
        const { result } = yield* dispatcher.invokeTrigger({
          trigger,
          event: { data: { tick: 42 } } satisfies TriggerEvent.DirectEvent,
        });

        expect(result).toEqual(Exit.succeed({ data: { tick: 42 } }));
      }, Effect.provide(TestLayer())),
    );

    it.effect(
      'should not invoke direct triggers from scheduled dispatch',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = yield* registerOperation(Reply);
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specDirect(),
        });
        yield* Database.add(trigger);
        const dispatcher = yield* TriggerDispatcher;
        const invocations = yield* dispatcher.invokeScheduledTriggers({ kinds: ['direct'] });

        expect(invocations).toEqual([]);
      }, Effect.provide(TestLayer())),
    );

    it.effect(
      'should manually invoke trigger',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = yield* registerOperation(Reply);
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specTimer('*/5 * * * *'),
        });
        yield* Database.add(trigger);
        const dispatcher = yield* TriggerDispatcher;
        const { result } = yield* dispatcher.invokeTrigger({
          trigger,
          event: { tick: 0 },
        });

        expect(result).toEqual(Exit.succeed({ tick: 0 }));
      }, Effect.provide(TestLayer())),
    );

    it.effect(
      'should invoke trigger referencing a registry operation by key DXN',
      Effect.fnUntraced(function* ({ expect }) {
        // Register the operation descriptor in the in-process registry (not the space db); the
        // executable handler is provided by ExampleHandlers. The trigger references it by key DXN
        // and resolves through the generic registry ref resolver.
        const { db } = yield* Database.Service;
        db.registry.add([Operation.serialize(Reply)]);
        const trigger = Trigger.make({
          runnable: Ref.fromURI(Reply.meta.key),
          enabled: true,
          spec: Trigger.specTimer('*/5 * * * *'),
        });
        yield* Database.add(trigger);
        const dispatcher = yield* TriggerDispatcher;
        const { result } = yield* dispatcher.invokeTrigger({
          trigger,
          event: { tick: 0 },
        });

        expect(result).toEqual(Exit.succeed({ tick: 0 }));
      }, Effect.provide(TestLayer())),
    );
  });

  describe('Timer Triggers', () => {
    // A schedule finer than the poll cannot be honoured: the tick finds it due, fires it once and
    // skips to the next occurrence after now, dropping the ones in between. It is refused rather
    // than run at the poll rate under a faster name.
    it.effect(
      'refuses a cron finer than the poll interval',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = yield* registerOperation(Reply);
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specTimer('*/5 * * * * *'), // Every 5s, against the 1-minute default.
        });
        yield* Database.add(trigger);

        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();
        yield* dispatcher.advanceTime(Duration.minutes(1));

        expect(yield* dispatcher.invokeScheduledTriggers({ kinds: ['timer'] })).toEqual([]);
      }, Effect.provide(TestLayer())),
    );

    // The regression: sampling ONE gap is sample-dependent. `0,5 * * * * *` alternates 5s and 55s, so
    // a measurement landing on the long gap reports a schedule that clears a one-minute floor while
    // the 5s pair it also has would be dropped every minute. The floor reads the SHORTEST gap.
    it.effect(
      'refuses a clustered cron whose typical spacing clears the poll interval',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = yield* registerOperation(Reply);
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specTimer('0,5 * * * * *'),
        });
        yield* Database.add(trigger);

        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();
        yield* dispatcher.advanceTime(Duration.minutes(1));

        expect(yield* dispatcher.invokeScheduledTriggers({ kinds: ['timer'] })).toEqual([]);
      }, Effect.provide(TestLayer())),
    );

    it.effect(
      'allows a sub-minute cron when the caller shortens the poll interval',
      Effect.fnUntraced(
        function* ({ expect }) {
          const functionObj = yield* registerOperation(Reply);
          const trigger = Trigger.make({
            runnable: Ref.make(functionObj),
            enabled: true,
            spec: Trigger.specTimer('*/5 * * * * *'),
          });
          yield* Database.add(trigger);

          const dispatcher = yield* TriggerDispatcher;
          yield* dispatcher.refreshTriggers();
          yield* dispatcher.advanceTime(Duration.minutes(1));

          const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['timer'] });
          expect(results.length).toBe(1);
          expect(results[0].triggerId).toBe(trigger.id);
        },
        Effect.provide(TestLayer({ livePollInterval: Duration.seconds(1) })),
      ),
    );

    it.effect(
      'should invoke scheduled timer triggers',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = yield* registerOperation(Reply);
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specTimer('* * * * *'), // Every minute - should trigger immediately
        });
        yield* Database.add(trigger);

        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();

        // Manually invoke the trigger
        yield* dispatcher.advanceTime(Duration.minutes(1));
        const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['timer'] });

        // Should have executed successfully
        expect(results.length).toBe(1);
        expect(results[0].triggerId).toBe(trigger.id);
        expect(Exit.isSuccess(results[0].result)).toBe(true);
      }, Effect.provide(TestLayer())),
    );

    it.effect(
      'should handle disabled triggers',
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

        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();

        // Manually test invocation of enabled vs disabled
        yield* dispatcher.advanceTime(Duration.minutes(1));
        const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['timer'] });

        // Enabled should succeed
        expect(results.length).toBe(1);
        expect(results[0].triggerId).toBe(enabledTrigger.id);
        expect(Exit.isSuccess(results[0].result)).toBe(true);
      }, Effect.provide(TestLayer())),
    );

    it.effect(
      'cron triggers are invoked periodically on schedule',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = yield* registerOperation(Reply);

        // cron every 5 minutes
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specTimer('*/5 * * * *'),
        });
        yield* Database.add(trigger);

        // now = 15:01
        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers(); // next execution = 15:05

        // advance 1 minute; now = 15:02 -- trigger should not be invoked
        yield* dispatcher.advanceTime(Duration.minutes(1));
        let results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['timer'] });
        expect(results.length).toBe(0);

        // advance 4 more minutes; now = 15:06 -- trigger should be invoked
        yield* dispatcher.advanceTime(Duration.minutes(4));
        results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['timer'] });
        expect(results.length).toBe(1);

        // advance 2 more minutes; now = 15:08 -- trigger should not be invoked
        yield* dispatcher.advanceTime(Duration.minutes(2));
        results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['timer'] });
        expect(results.length).toBe(0);

        // advance 3 more minutes; now = 15:11 -- trigger should be invoked
        yield* dispatcher.advanceTime(Duration.minutes(3));
        results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['timer'] });
        expect(results.length).toBe(1);
      }, Effect.provide(TestLayer())),
    );
  });

  describe('Failure Cooldown', () => {
    it.effect(
      'failed trigger is skipped during cooldown and resumes after',
      Effect.fnUntraced(
        function* ({ expect }) {
          // Use a Person object as the function ref so trigger invocation fails the
          // `Obj.instanceOf(Operation.PersistentOperation, ...)` invariant.
          const badFn = Obj.make(Person.Person, { fullName: 'not-an-operation' });
          const { db } = yield* Database.Service;
          db.registry.add([badFn]);

          const trigger = Trigger.make({
            runnable: Ref.make(badFn as Runnable.Runnable),
            enabled: true,
            spec: Trigger.specTimer('* * * * *'),
          });
          yield* Database.add(trigger);

          const dispatcher = yield* TriggerDispatcher;
          yield* dispatcher.refreshTriggers();

          // First scheduled run -- fails and arms the cooldown.
          yield* dispatcher.advanceTime(Duration.minutes(1));
          let results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['timer'] });
          expect(results.length).toBe(1);
          expect(Exit.isFailure(results[0].result)).toBe(true);

          // Within cooldown window (cron would otherwise fire) -- skipped.
          yield* dispatcher.advanceTime(Duration.minutes(2));
          results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['timer'] });
          expect(results.length).toBe(0);

          // Past cooldown -- runs again (and fails again).
          yield* dispatcher.advanceTime(Duration.minutes(4));
          results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['timer'] });
          expect(results.length).toBe(1);
          expect(Exit.isFailure(results[0].result)).toBe(true);
        },
        Effect.provide(
          TestLayer({
            timeControl: 'manual',
            startingTime: new Date('2025-09-05T15:01:00.000Z'),
            failureCooldown: Duration.minutes(5),
          }),
        ),
      ),
    );
  });

  describe('Dynamic Trigger Management', () => {
    it.effect(
      'should handle trigger updates dynamically',
      Effect.fnUntraced(function* ({ expect }) {
        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();

        // Initially no triggers in database

        // Add a trigger dynamically
        const functionObj = yield* registerOperation(Reply);
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specTimer('* * * * *'), // Every minute
        });
        yield* Database.add(trigger);

        // Can invoke the trigger
        const result = yield* dispatcher.invokeTrigger({ trigger, event: { tick: 0 } });
        expect(Exit.isSuccess(result.result)).toBe(true);
      }, Effect.provide(TestLayer())),
    );
  });

  describe('Cron Patterns', () => {
    it.effect(
      'should support Effect cron expressions',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = yield* registerOperation(Reply);

        const validPatterns = [
          '* * * * *', // Every minute
          '0 * * * *', // Every hour
          '0 0 * * *', // Daily
          '0 0 * * 1', // Every Monday
          '0 9-17 * * *', // Every hour from 9 AM to 5 PM
        ];

        const dispatcher = yield* TriggerDispatcher;

        // Test that valid patterns can be invoked
        for (const cron of validPatterns) {
          const trigger = Trigger.make({
            runnable: Ref.make(functionObj),
            enabled: true,
            spec: Trigger.specTimer(cron),
          });
          yield* Database.add(trigger);

          const result = yield* dispatcher.invokeTrigger({ trigger, event: { tick: 0 } });
          expect(Exit.isSuccess(result.result)).toBe(true);
        }
      }, Effect.provide(TestLayer())),
    );

    it.effect(
      'should handle invalid cron expressions gracefully',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = yield* registerOperation(Reply);

        // Test with an invalid pattern
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specTimer('invalid-cron'),
        });
        yield* Database.add(trigger);

        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();

        // Can still invoke manually even with invalid cron
        const result = yield* dispatcher.invokeScheduledTriggers({ kinds: ['timer'] });
        expect(result.length).toBe(0);
      }, Effect.provide(TestLayer())),
    );
  });

  describe('Natural Time Control', () => {
    it.effect(
      'should start and stop dispatcher',
      Effect.fnUntraced(
        function* () {
          const dispatcher = yield* TriggerDispatcher;
          yield* dispatcher.start();
          yield* dispatcher.stop();
        },
        Effect.provide(TestLayer({ timeControl: 'natural' })),
      ),
    );

    // `it.live` (not `it.effect`): the reactive path is woken by real subscriptions, so the wait
    // below observes a live registry subscription rather than a virtual clock nothing advances.
    it.live(
      'feed triggers fire on append without waiting for a poll tick',
      Effect.fnUntraced(
        function* ({ expect }) {
          const feed = yield* Database.add(Feed.make());
          const functionObj = yield* registerOperation(Reply);
          const trigger = Trigger.make({
            runnable: Ref.make(functionObj),
            enabled: true,
            spec: Trigger.specFeed(feed),
          });
          yield* Database.add(trigger);

          const dispatcher = yield* TriggerDispatcher;
          yield* dispatcher.start();

          // Stopped in a finalizer: a failure below would otherwise leave the detached timer fiber
          // and the reactive subscriptions running into the next test.
          yield* Effect.gen(function* () {
            yield* Feed.append(feed, [Obj.make(Person.Person, { fullName: 'John Doe' })]);
            yield* Database.flush();

            // The poll interval is an hour, so observing an invocation here confirms the feed
            // subscription (not the poll) fired the trigger.
            const registry = yield* Registry.AtomRegistry;
            const fired = yield* Effect.callback<void>((resume) => {
              // `{ immediate: true }` can invoke this callback synchronously, before `subscribe`
              // returns — reading `unsubscribe` there would hit the temporal dead zone, and a
              // synchronous `resume` skips Effect's returned-finalizer path entirely (it only runs
              // on interruption), so an immediate match unsubscribes directly instead of relying on it.
              let unsubscribe: (() => void) | undefined;
              let matchedBeforeSubscribeReturned = false;
              unsubscribe = registry.subscribe(
                dispatcher.state,
                (state) => {
                  if (state.invocations.some((invocation) => invocation.trigger.id === trigger.id)) {
                    if (unsubscribe) {
                      unsubscribe();
                    } else {
                      matchedBeforeSubscribeReturned = true;
                    }
                    resume(Effect.void);
                  }
                },
                { immediate: true },
              );
              if (matchedBeforeSubscribeReturned) {
                unsubscribe();
                return;
              }
              return Effect.sync(() => unsubscribe?.());
            }).pipe(Effect.timeoutOption(Duration.seconds(2)), Effect.map(Option.isSome));
            expect(fired).toBe(true);
          }).pipe(Effect.ensuring(dispatcher.stop()));
        },
        Effect.provide(TestLayer({ timeControl: 'natural', livePollInterval: Duration.hours(1) })),
      ),
    );
  });

  describe('Feed Triggers', () => {
    it.effect(
      'should invoke scheduled feed triggers',
      Effect.fnUntraced(function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());

        const functionObj = yield* registerOperation(Reply);
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specFeed(feed),
        });
        yield* Database.add(trigger);
        yield* Feed.append(feed, [
          Obj.make(Person.Person, {
            fullName: 'John Doe',
          }),
        ]);

        const dispatcher = yield* TriggerDispatcher;
        const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['feed'] });
        expect(results.length).toBe(1);
        expect(results[0].triggerId).toBe(trigger.id);
        expect(Exit.isSuccess(results[0].result)).toBe(true);
      }, Effect.provide(TestLayer())),
    );

    it.effect(
      'triggers are invoked one by one',
      Effect.fnUntraced(function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());

        const functionObj = yield* registerOperation(Reply);
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specFeed(feed),
        });
        yield* Database.add(trigger);
        yield* Feed.append(feed, [
          Obj.make(Person.Person, {
            fullName: 'John Doe',
          }),
          Obj.make(Person.Person, {
            fullName: 'Jane Smith',
          }),
        ]);

        const dispatcher = yield* TriggerDispatcher;

        {
          const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['feed'] });
          expect(results.length).toBe(1);
          expect(results[0].triggerId).toBe(trigger.id);
          expect(Exit.isSuccess(results[0].result)).toBe(true);
        }

        {
          const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['feed'] });
          expect(results.length).toBe(1);
          expect(results[0].triggerId).toBe(trigger.id);
          expect(Exit.isSuccess(results[0].result)).toBe(true);
        }

        {
          const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['feed'] });
          expect(results.length).toBe(0);
        }
      }, Effect.provide(TestLayer())),
    );

    it.effect(
      'the cursor is an annotation, and a legacy foreign key is adopted',
      Effect.fnUntraced(function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());
        const functionObj = yield* registerOperation(Reply);
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specFeed(feed),
        });
        yield* Database.add(trigger);
        yield* Feed.append(feed, [
          Obj.make(Person.Person, { fullName: 'John Doe' }),
          Obj.make(Person.Person, { fullName: 'Jane Smith' }),
        ]);

        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.invokeScheduledTriggers({ kinds: ['feed'] });

        // The checkpoint lands in the annotation, not in `@meta.keys`.
        const cursor = Annotation.get(trigger, Feed.CursorAnnotation).pipe(Option.getOrUndefined);
        expect(cursor).toBeDefined();
        expect(Obj.getKeys(trigger, LEGACY_KEY_FEED_CURSOR)).toEqual([]);

        // A trigger checkpointed by the release that used a foreign key resumes from it rather than
        // re-dispatching its whole feed.
        Obj.update(trigger, (trigger) => {
          Obj.getMeta(trigger).annotations = {};
          Obj.getMeta(trigger).keys.push({ source: LEGACY_KEY_FEED_CURSOR, id: cursor! });
        });
        yield* Database.flush();

        const resumed = yield* dispatcher.invokeScheduledTriggers({ kinds: ['feed'] });
        expect(resumed.length).toBe(1);
        expect(resumed[0].feedCursor).not.toBe(cursor);
        expect(Obj.getKeys(trigger, LEGACY_KEY_FEED_CURSOR)).toEqual([]);
      }, Effect.provide(TestLayer())),
    );

    it.effect(
      'builds input from pattern',
      Effect.fnUntraced(function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());

        const functionObj = yield* registerOperation(Reply);
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specFeed(feed),
          input: {
            instructions: 'Please process the queue item.',
            input: '{{event.item}}',
            triggerId: '{{trigger.id}}',
          },
        });
        yield* Database.add(trigger);
        const person = Obj.make(Person.Person, {
          fullName: 'John Doe',
        });
        yield* Feed.append(feed, [person]);

        const dispatcher = yield* TriggerDispatcher;
        const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['feed'] });
        expect(results.length).toBe(1);
        expect(results[0].triggerId).toBe(trigger.id);
        const exit = results[0].result;
        invariant(Exit.isSuccess(exit));
        expect(exit.value).to.deep.include({
          instructions: 'Please process the queue item.',
          input: {
            id: person.id,
            fullName: 'John Doe',
          },
          triggerId: trigger.id,
        });
      }, Effect.provide(TestLayer())),
    );

    it.effect(
      'respects trigger concurrency without untilExhausted',
      Effect.fnUntraced(function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());

        const functionObj = yield* registerOperation(Reply);
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          concurrency: 2,
          spec: Trigger.specFeed(feed),
        });
        yield* Database.add(trigger);
        yield* Feed.append(feed, [
          Obj.make(Person.Person, { fullName: 'Alice' }),
          Obj.make(Person.Person, { fullName: 'Bob' }),
          Obj.make(Person.Person, { fullName: 'Charlie' }),
        ]);

        const dispatcher = yield* TriggerDispatcher;

        {
          const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['feed'] });
          expect(results.length).toBe(2);
          expect(results.every((r) => Exit.isSuccess(r.result))).toBe(true);
        }

        {
          const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['feed'] });
          expect(results.length).toBe(1);
          expect(results[0].triggerId).toBe(trigger.id);
          expect(Exit.isSuccess(results[0].result)).toBe(true);
        }

        {
          const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['feed'] });
          expect(results.length).toBe(0);
        }
      }, Effect.provide(TestLayer())),
    );
  });

  describe('Database Triggers (Subscription)', () => {
    it.effect(
      'should invoke triggers on object creation',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = yield* registerOperation(Reply);

        // Create a subscription trigger that watches for Person objects
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specSubscription(Query.select(Filter.type(Person.Person))),
        });
        yield* Database.add(trigger);

        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();

        // Create a new Person object - this should trigger the subscription
        const person = Obj.make(Person.Person, {
          fullName: 'Alice Smith',
        });
        yield* Database.add(person);

        // Invoke scheduled triggers to check if subscription fires
        const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });

        // Should have triggered for the new person
        expect(results.length).toBe(1);
        expect(results[0].triggerId).toBe(trigger.id);
        expect(Exit.isSuccess(results[0].result)).toBe(true);
      }, Effect.provide(TestLayer())),
    );

    it.effect(
      'should invoke triggers on object updates',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = yield* registerOperation(Reply);

        // Create a person object first
        const person = Obj.make(Person.Person, {
          fullName: 'Bob Jones',
        });
        yield* Database.add(person);

        // Create a subscription trigger
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specSubscription(Query.select(Filter.type(Person.Person))),
        });
        yield* Database.add(trigger);

        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();

        // Initial check - should trigger for existing object
        let results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
        expect(results.length).toBe(1);

        // Update the person object
        Obj.update(person, (person) => {
          person.fullName = 'Robert Jones';
        });
        yield* Database.flush({ indexes: true });

        // Should trigger again for the update
        results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
        expect(results.length).toBe(1);
        expect(results[0].triggerId).toBe(trigger.id);
        expect(Exit.isSuccess(results[0].result)).toBe(true);
      }, Effect.provide(TestLayer())),
    );

    it.effect(
      'should not invoke triggers for unchanged objects',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = yield* registerOperation(Reply);

        // Create a subscription trigger first
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specSubscription(Query.select(Filter.type(Person.Person))),
        });
        yield* Database.add(trigger);

        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();

        // Create a person object
        const person = Obj.make(Person.Person, {
          fullName: 'Charlie Brown',
        });
        yield* Database.add(person);

        // First invocation - should trigger for new object
        let results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
        expect(results.length).toBe(1);

        // Second invocation without any changes - should not trigger
        results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
        expect(results.length).toBe(0);

        // Update the object
        Obj.update(person, (person) => {
          person.fullName = 'Charles Brown';
        });
        yield* Database.flush({ indexes: true });

        // Third invocation - should trigger for the update
        results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
        expect(results.length).toBe(1);

        // Fourth invocation without changes - should not trigger
        results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
        expect(results.length).toBe(0);
      }, Effect.provide(TestLayer())),
    );

    it.effect(
      'should handle multiple object types with filters',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = yield* registerOperation(Reply);

        // Create a subscription trigger that only watches for Task objects
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specSubscription(Query.select(Filter.type(Task.Task))),
        });
        yield* Database.add(trigger);

        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();

        // Create a Person object - should NOT trigger
        const person = Obj.make(Person.Person, {
          fullName: 'David Wilson',
        });
        yield* Database.add(person);

        let results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
        expect(results.length).toBe(0);

        // Create a Task object - should trigger
        const task = Obj.make(Task.Task, {
          title: 'Important task',
        });
        yield* Database.add(task);

        results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
        expect(results.length).toBe(1);
        expect(results[0].triggerId).toBe(trigger.id);
        expect(Exit.isSuccess(results[0].result)).toBe(true);
      }, Effect.provide(TestLayer())),
    );

    it.effect(
      'should pass correct event data to function',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = yield* registerOperation(Reply);

        const person = Obj.make(Person.Person, {
          fullName: 'Eva Martinez',
        });
        yield* Database.add(person);

        // Create a subscription trigger with input pattern
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specSubscription(Query.select(Filter.type(Person.Person))),
          input: {
            objectId: '{{event.changedObjectId}}',
            changeType: '{{event.type}}',
            triggerId: '{{trigger.id}}',
          },
        });
        yield* Database.add(trigger);

        const dispatcher = yield* TriggerDispatcher;
        const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });

        expect(results.length).toBe(1);
        const exit = results[0].result;
        invariant(Exit.isSuccess(exit));
        expect(exit.value).to.deep.include({
          objectId: person.id,
          changeType: 'created',
          triggerId: trigger.id,
        });
      }, Effect.provide(TestLayer())),
    );

    it.effect(
      'reports updated for a modified object',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = yield* registerOperation(Reply);
        const person = yield* Database.add(Obj.make(Person.Person, { fullName: 'Uma' }));
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specSubscription(Query.select(Filter.type(Person.Person))),
          input: { changeType: '{{event.type}}', objectId: '{{event.changedObjectId}}' },
        });
        yield* Database.add(trigger);
        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();

        // First dispatch consumes the `created`.
        yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });

        Obj.update(person, (person) => {
          person.fullName = 'Uma Thurman';
        });
        yield* Database.flush({ indexes: true });

        const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
        expect(results.length).toBe(1);
        const exit = results[0].result;
        invariant(Exit.isSuccess(exit));
        expect(exit.value).to.deep.include({ changeType: 'updated', objectId: person.id });
      }, Effect.provide(TestLayer())),
    );

    it.effect(
      'reports deleted for a removed object, then a fresh created on re-add',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = yield* registerOperation(Reply);
        const person = yield* Database.add(Obj.make(Person.Person, { fullName: 'Del' }));
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specSubscription(Query.select(Filter.type(Person.Person))),
          input: { changeType: '{{event.type}}', objectId: '{{event.changedObjectId}}' },
        });
        yield* Database.add(trigger);
        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();

        yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });

        yield* Database.remove(person);
        yield* Database.flush({ indexes: true });

        {
          const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
          expect(results.length).toBe(1);
          const exit = results[0].result;
          invariant(Exit.isSuccess(exit));
          expect(exit.value).to.deep.include({ changeType: 'deleted', objectId: person.id });
        }

        // The delete dropped the processed-version key, so a new object reads as a fresh create.
        const replacement = yield* Database.add(Obj.make(Person.Person, { fullName: 'Del II' }));
        yield* Database.flush({ indexes: true });
        {
          const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
          expect(results.length).toBe(1);
          const exit = results[0].result;
          invariant(Exit.isSuccess(exit));
          expect(exit.value).to.deep.include({ changeType: 'created', objectId: replacement.id });
        }
      }, Effect.provide(TestLayer())),
    );

    it.effect(
      'event.subject dereferences to the mutated object',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = yield* registerOperation(SubjectProbeOp);
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specSubscription(Query.select(Filter.type(Person.Person))),
        });
        yield* Database.add(trigger);
        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();

        const person = yield* Database.add(Obj.make(Person.Person, { fullName: 'Subj' }));
        const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
        expect(results.length).toBe(1);
        const exit = results[0].result;
        invariant(Exit.isSuccess(exit));
        expect(exit.value).to.deep.include({ type: 'created', subjectId: person.id });
      }, Effect.provide(TestLayer())),
    );
  });

  describe('Feed-sourced Subscription', () => {
    it.effect(
      'reports created for a feed-appended object',
      Effect.fnUntraced(function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());
        yield* Database.flush();
        const feedUri = Feed.getFeedUri(feed);
        invariant(feedUri);
        const functionObj = yield* registerOperation(Reply);
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specSubscription(Query.select(Filter.everything()).from(Scope.feed(feedUri))),
          input: { changeType: '{{event.type}}', objectId: '{{event.changedObjectId}}' },
        });
        yield* Database.add(trigger);
        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();

        const person = Obj.make(Person.Person, { fullName: 'Feedy' });
        yield* Feed.append(feed, [person]);

        const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
        expect(results.length).toBe(1);
        const exit = results[0].result;
        invariant(Exit.isSuccess(exit));
        expect(exit.value).to.deep.include({ changeType: 'created', objectId: person.id });
      }, Effect.provide(TestLayer())),
    );

    it.effect(
      'reports updated for a re-appended (mutated) feed object',
      Effect.fnUntraced(function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());
        yield* Database.flush();
        const feedUri = Feed.getFeedUri(feed);
        invariant(feedUri);
        const functionObj = yield* registerOperation(Reply);
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specSubscription(Query.select(Filter.everything()).from(Scope.feed(feedUri))),
          input: { changeType: '{{event.type}}', objectId: '{{event.changedObjectId}}' },
        });
        yield* Database.add(trigger);
        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();

        const person = Obj.make(Person.Person, { fullName: 'FeedUp' });
        yield* Feed.append(feed, [person]);
        yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });

        Obj.update(person, (person) => {
          person.fullName = 'FeedUp v2';
        });
        yield* Database.flush({ indexes: true });

        const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
        expect(results.length).toBe(1);
        const exit = results[0].result;
        invariant(Exit.isSuccess(exit));
        expect(exit.value).to.deep.include({ changeType: 'updated', objectId: person.id });
      }, Effect.provide(TestLayer())),
    );

    it.effect(
      'reports deleted for a removed feed object',
      Effect.fnUntraced(function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());
        yield* Database.flush();
        const feedUri = Feed.getFeedUri(feed);
        invariant(feedUri);
        const functionObj = yield* registerOperation(Reply);
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specSubscription(Query.select(Filter.everything()).from(Scope.feed(feedUri))),
          input: { changeType: '{{event.type}}', objectId: '{{event.changedObjectId}}' },
        });
        yield* Database.add(trigger);
        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();

        const person = Obj.make(Person.Person, { fullName: 'FeedDel' });
        yield* Feed.append(feed, [person]);
        yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });

        yield* Feed.remove(feed, [person]);
        yield* Database.flush({ indexes: true });

        const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
        expect(results.length).toBe(1);
        const exit = results[0].result;
        invariant(Exit.isSuccess(exit));
        expect(exit.value).to.deep.include({ changeType: 'deleted', objectId: person.id });
      }, Effect.provide(TestLayer())),
    );

    it.effect(
      'only fires for feed items matching the filter',
      Effect.fnUntraced(function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());
        yield* Database.flush();
        const feedUri = Feed.getFeedUri(feed);
        invariant(feedUri);
        const functionObj = yield* registerOperation(Reply);
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specSubscription(Query.select(Filter.type(Task.Task)).from(Scope.feed(feedUri))),
          input: { changeType: '{{event.type}}', objectId: '{{event.changedObjectId}}' },
        });
        yield* Database.add(trigger);
        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();

        yield* Feed.append(feed, [Obj.make(Person.Person, { fullName: 'ignored' })]);
        const task = Obj.make(Task.Task, { title: 'watched' });
        yield* Feed.append(feed, [task]);

        const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
        expect(results.length).toBe(1);
        const exit = results[0].result;
        invariant(Exit.isSuccess(exit));
        expect(exit.value).to.deep.include({ changeType: 'created', objectId: task.id });
      }, Effect.provide(TestLayer())),
    );
  });

  // Regression coverage for an issue where `invokeTrigger` spawned operations
  // without an `environment`, so the `ServiceResolver` ran with an empty
  // `LayerSpec.LayerContext` and could not satisfy space-affinity service
  // requirements such as `Database.Service`. The dispatcher must thread its
  // own space context into `ProcessManager.spawn` so dispatched operations
  // can resolve the same space-scoped services their handler declares.
  describe('Service Resolution', () => {
    it.effect(
      'invokeTrigger spawns operations with the dispatcher environment so space-affinity services resolve',
      Effect.fnUntraced(
        function* ({ expect }) {
          const functionObj = yield* registerOperation(ProbeOp);

          const trigger = Trigger.make({
            runnable: Ref.make(functionObj),
            enabled: true,
            spec: Trigger.specTimer('* * * * *'),
          });
          yield* Database.add(trigger);

          const dispatcher = yield* TriggerDispatcher;
          const { result } = yield* dispatcher.invokeTrigger({ trigger, event: { tick: 0 } });

          invariant(
            Exit.isSuccess(result),
            `trigger invocation failed: ${Exit.isFailure(result) ? String(result.cause) : ''}`,
          );

          const { db } = yield* Database.Service;
          expect(result.value).toEqual({ spaceId: db.spaceId });
        },
        Effect.provide(
          TestLayer({
            timeControl: 'manual',
            startingTime: new Date('2025-09-05T15:01:00.000Z'),
            spaceAwareResolver: true,
          }),
        ),
      ),
    );
  });

  describe('Retry', () => {
    it.effect(
      'should if trigger returns RunAgainError',
      Effect.fnUntraced(function* ({ expect }) {
        const dispatcher = yield* TriggerDispatcher;
        const op = yield* registerOperation(RetryOp);
        const trigger = Trigger.make({
          runnable: Ref.make(op),
          enabled: true,
          spec: Trigger.specDirect(),
        });
        yield* Database.add(trigger);
        yield* dispatcher.invokeTrigger({ trigger, event: {} });

        yield* dispatcher.invokeScheduledTriggers({ untilExhausted: true });
        const counter = yield* Database.query(Filter.type(RetryCounter)).first.pipe(
          Effect.flatMap((result) => Effect.fromOption(result)),
        );
        expect(counter.count).toBe(3);
      }, Effect.provide(TestLayer())),
    );

    it.effect(
      'a genuine failure arms cooldown rather than a retry',
      Effect.fnUntraced(
        function* ({ expect }) {
          // A Person object is not a persistent operation, so invocation fails the instance
          // invariant -- a genuine failure, distinct from a RunAgainError re-invocation request.
          const badFn = Obj.make(Person.Person, { fullName: 'not-an-operation' });
          const { db } = yield* Database.Service;
          db.registry.add([badFn]);

          const trigger = Trigger.make({
            runnable: Ref.make(badFn as Runnable.Runnable),
            enabled: true,
            spec: Trigger.specDirect(),
          });
          yield* Database.add(trigger);

          const dispatcher = yield* TriggerDispatcher;
          const { result } = yield* dispatcher.invokeTrigger({ trigger, event: {} });
          expect(Exit.isFailure(result)).toBe(true);

          // No retry is enqueued; draining does nothing and the trigger is in cooldown.
          const drained = yield* dispatcher.invokeScheduledTriggers({ untilExhausted: true });
          expect(drained.length).toBe(0);

          const registry = yield* Registry.AtomRegistry;
          const status = registry.get(dispatcher.state);
          const triggerStatus = status.triggers.find((t) => t.triggerId === trigger.id);
          expect(triggerStatus?.retryPending).toBe(false);
          expect(triggerStatus?.cooldownUntil).toBeInstanceOf(Date);
        },
        Effect.provide(
          TestLayer({
            timeControl: 'manual',
            startingTime: new Date('2025-09-05T15:01:00.000Z'),
            failureCooldown: Duration.minutes(5),
          }),
        ),
      ),
    );
  });

  describe('Runtime State', () => {
    it.effect(
      'exposes per-trigger cron schedule and last result',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = yield* registerOperation(Reply);
        const trigger = Trigger.make({
          runnable: Ref.make(functionObj),
          enabled: true,
          spec: Trigger.specTimer('*/5 * * * *'),
        });
        yield* Database.add(trigger);

        const dispatcher = yield* TriggerDispatcher;
        const registry = yield* Registry.AtomRegistry;
        yield* dispatcher.refreshTriggers();

        {
          const status = registry.get(dispatcher.state);
          const triggerStatus = status.triggers.find((t) => t.triggerId === trigger.id);
          expect(triggerStatus).toBeDefined();
          expect(triggerStatus?.nextExecution).toBeInstanceOf(Date);
          expect(triggerStatus?.retryPending).toBe(false);
          expect(triggerStatus?.lastResult).toBeUndefined();
        }

        yield* dispatcher.invokeTrigger({ trigger, event: { tick: 0 } });

        {
          const status = registry.get(dispatcher.state);
          const triggerStatus = status.triggers.find((t) => t.triggerId === trigger.id);
          const lastResult = triggerStatus?.lastResult;
          invariant(lastResult, 'expected a last result');
          expect(Exit.isSuccess(lastResult)).toBe(true);
        }
      }, Effect.provide(TestLayer())),
    );
  });
});
