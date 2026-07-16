//
// Copyright 2025 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as KeyValueStore from '@effect/platform/KeyValueStore';
import { describe, it } from '@effect/vitest';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import {
  Operation,
  OperationHandlerSet,
  ServiceNotAvailableError,
  ServiceResolver,
  Trace,
  Trigger,
  TriggerEvent,
} from '@dxos/compute';
import * as ProcessManager from '../ProcessManager';
import { ExampleHandlers, Reply } from '@dxos/compute/testing';
import { Database, DXN, Feed, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { credentialsLayerConfig } from '../services/credentials';
import { invariant } from '@dxos/invariant';
import { Person, Task } from '@dxos/types';

import { TriggerDispatcher } from './trigger-dispatcher';
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

/**
 * Operation whose handler depends on {@link Database.Service}. Resolved via the
 * operation handler set registered with {@link OperationHandlerSet.provide} below.
 */
const ProbeOp = Operation.make({
  meta: { key: DXN.make('test.trigger-dispatcher.probeDatabase'), name: 'Probe Database' },
  input: Schema.Any,
  output: Schema.Struct({ spaceId: Schema.String }),
  services: [Database.Service],
});

class RetryCounter extends Type.makeObject<RetryCounter>(DXN.make('test.trigger-dispatcher.retryCounter', '0.1.0'))(
  Schema.Struct({
    count: Schema.Number,
  }),
) {}

const RetryOp = Operation.make({
  meta: { key: DXN.make('test.trigger-dispatcher.retry'), name: 'Retry' },
  input: Schema.Void,
  output: Schema.Void,
  services: [Database.Service],
});

const TestHanlers = OperationHandlerSet.make(
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
          Effect.flatten,
          Effect.catchTag('NoSuchElementException', () => Database.add(Obj.make(RetryCounter, { count: 0 }))),
        );
        if (counter.count >= 3) {
          return;
        }

        Obj.update(counter, (counter) => {
          counter.count++;
        });
        yield* Operation.runAgain();
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
    spaceAwareResolver?: boolean;
  } = {},
) =>
  Layer.empty.pipe(
    Layer.provideMerge(
      TriggerDispatcher.layer({
        timeControl: options.timeControl ?? 'manual',
        startingTime: options.startingTime ?? new Date('2025-09-05T15:01:00.000Z'),
        failureCooldown: options.failureCooldown,
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
            runnable: Ref.make(badFn) as any,
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

    it.effect.skip(
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
          changeType: 'unknown', // TODO: This should be 'create' or 'update'
          triggerId: trigger.id,
        });
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
        const counter = yield* Database.query(Filter.type(RetryCounter)).first.pipe(Effect.flatten);
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
            runnable: Ref.make(badFn) as any,
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
