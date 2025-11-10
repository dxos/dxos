//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { describe, it } from '@effect/vitest';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fn from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { DataType } from '@dxos/schema';

import { serializeFunction } from '@dxos/functions';
import { ComputeEventLogger, CredentialsService, DatabaseService, QueueService } from '@dxos/functions';
import { FunctionInvocationServiceLayerTestMocked } from '../services/function-invocation-service';
import { TestDatabaseLayer } from '../testing';
import { TracingServiceExt } from '../trace';
import { Function, Trigger } from '../types';

import { InvocationTracer } from './invocation-tracer';
import { TriggerDispatcher } from './trigger-dispatcher';
import { TriggerStateStore } from './trigger-state-store';

// Example function for testing
const Example = {
  reply: defineFunction({
    key: 'example.org/function/reply',
    name: 'reply',
    inputSchema: Schema.Struct({ message: Schema.String }),
    outputSchema: Schema.String,
    handler: ({ data }) => `Reply: ${data.message}`,
  }),
};

const TestLayer = Fn.pipe(
  Layer.mergeAll(ComputeEventLogger.layerFromTracing, InvocationTracer.layerTest, TriggerStateStore.layerMemory),
  Layer.provideMerge(
    Layer.mergeAll(
      AiService.notAvailable,
      CredentialsService.layerConfig([]),
      FunctionInvocationServiceLayerTestMocked({ functions: [Example.reply] }).pipe(
        Layer.provideMerge(ComputeEventLogger.layerFromTracing),
        Layer.provideMerge(TracingServiceExt.layerLogInfo()),
      ),
      FetchHttpClient.layer,
      TestDatabaseLayer({
        types: [Function.Function, Trigger.Trigger, DataType.Person.Person, DataType.Task.Task],
      }),
    ),
  ),
);

const TestTriggerDispatcherLayer = Layer.provideMerge(
  TriggerDispatcher.layer({ timeControl: 'manual', startingTime: new Date('2025-09-05T15:01:00.000Z') }),
  TestLayer,
);

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
      }, Effect.provide(TestTriggerDispatcherLayer)),
    );
  });

  describe('Manual Invocation', () => {
    it.effect(
      'should manually invoke trigger',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = serializeFunction(Example.reply);
        yield* DatabaseService.add(functionObj);
        const trigger = Trigger.make({
          function: Ref.make(functionObj),
          enabled: true,
          spec: {
            kind: 'timer',
            cron: '*/5 * * * *',
          },
        });
        yield* DatabaseService.add(trigger);
        const dispatcher = yield* TriggerDispatcher;
        const { result } = yield* dispatcher.invokeTrigger({
          trigger,
          event: { tick: 0 },
        });

        expect(result).toEqual(Exit.succeed({ tick: 0 }));
      }, Effect.provide(TestTriggerDispatcherLayer)),
    );
  });

  describe('Timer Triggers', () => {
    it.effect(
      'should invoke scheduled timer triggers',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = serializeFunction(Example.reply);
        yield* DatabaseService.add(functionObj);
        const trigger = Trigger.make({
          function: Ref.make(functionObj),
          enabled: true,
          spec: {
            kind: 'timer',
            cron: '* * * * *', // Every minute - should trigger immediately
          },
        });
        yield* DatabaseService.add(trigger);

        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();

        // Manually invoke the trigger
        yield* dispatcher.advanceTime(Duration.minutes(1));
        const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['timer'] });

        // Should have executed successfully
        expect(results.length).toBe(1);
        expect(results[0].triggerId).toBe(trigger.id);
        expect(Exit.isSuccess(results[0].result)).toBe(true);
      }, Effect.provide(TestTriggerDispatcherLayer)),
    );

    it.effect(
      'should handle disabled triggers',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = serializeFunction(Example.reply);
        yield* DatabaseService.add(functionObj);

        const enabledTrigger = Trigger.make({
          function: Ref.make(functionObj),
          enabled: true,
          spec: {
            kind: 'timer',
            cron: '* * * * *',
          },
        });

        const disabledTrigger = Trigger.make({
          function: Ref.make(functionObj),
          enabled: false,
          spec: {
            kind: 'timer',
            cron: '* * * * *',
          },
        });

        yield* DatabaseService.add(enabledTrigger);
        yield* DatabaseService.add(disabledTrigger);

        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();

        // Manually test invocation of enabled vs disabled
        yield* dispatcher.advanceTime(Duration.minutes(1));
        const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['timer'] });

        // Enabled should succeed
        expect(results.length).toBe(1);
        expect(results[0].triggerId).toBe(enabledTrigger.id);
        expect(Exit.isSuccess(results[0].result)).toBe(true);
      }, Effect.provide(TestTriggerDispatcherLayer)),
    );

    it.effect(
      'cron triggers are invoked periodically on schedule',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = serializeFunction(Example.reply);
        yield* DatabaseService.add(functionObj);

        // cron every 5 minutes
        const trigger = Trigger.make({
          function: Ref.make(functionObj),
          enabled: true,
          spec: {
            kind: 'timer',
            cron: '*/5 * * * *',
          },
        });
        yield* DatabaseService.add(trigger);

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
      }, Effect.provide(TestTriggerDispatcherLayer)),
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
        const functionObj = serializeFunction(Example.reply);
        yield* DatabaseService.add(functionObj);
        const trigger = Trigger.make({
          function: Ref.make(functionObj),
          enabled: true,
          spec: {
            kind: 'timer',
            cron: '* * * * *', // Every minute
          },
        });
        yield* DatabaseService.add(trigger);

        // Can invoke the trigger
        const result = yield* dispatcher.invokeTrigger({ trigger, event: { tick: 0 } });
        expect(Exit.isSuccess(result.result)).toBe(true);
      }, Effect.provide(TestTriggerDispatcherLayer)),
    );
  });

  describe('Cron Patterns', () => {
    it.effect(
      'should support Effect cron expressions',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = serializeFunction(Example.reply);
        yield* DatabaseService.add(functionObj);

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
            function: Ref.make(functionObj),
            enabled: true,
            spec: {
              kind: 'timer',
              cron,
            },
          });
          yield* DatabaseService.add(trigger);

          const result = yield* dispatcher.invokeTrigger({ trigger, event: { tick: 0 } });
          expect(Exit.isSuccess(result.result)).toBe(true);
        }
      }, Effect.provide(TestTriggerDispatcherLayer)),
    );

    it.effect(
      'should handle invalid cron expressions gracefully',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = serializeFunction(Example.reply);
        yield* DatabaseService.add(functionObj);

        // Test with an invalid pattern
        const trigger = Trigger.make({
          function: Ref.make(functionObj),
          enabled: true,
          spec: {
            kind: 'timer',
            cron: 'invalid-cron',
          },
        });
        yield* DatabaseService.add(trigger);

        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();

        // Can still invoke manually even with invalid cron
        const result = yield* dispatcher.invokeScheduledTriggers({ kinds: ['timer'] });
        expect(result.length).toBe(0);
      }, Effect.provide(TestTriggerDispatcherLayer)),
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
        Effect.provide(Layer.provideMerge(TriggerDispatcher.layer({ timeControl: 'natural' }), TestLayer)),
      ),
    );
  });

  describe('Queue Triggers', () => {
    it.effect(
      'should invoke scheduled queue triggers',
      Effect.fnUntraced(function* ({ expect }) {
        const queue = yield* QueueService.createQueue();
        const functionObj = serializeFunction(Example.reply);
        yield* DatabaseService.add(functionObj);
        const trigger = Trigger.make({
          function: Ref.make(functionObj),
          enabled: true,
          spec: {
            kind: 'queue',
            queue: queue.dxn.toString(),
          },
        });
        yield* DatabaseService.add(trigger);
        yield* QueueService.append(queue, [
          Obj.make(DataType.Person.Person, {
            fullName: 'John Doe',
          }),
        ]);

        const dispatcher = yield* TriggerDispatcher;
        const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['queue'] });
        expect(results.length).toBe(1);
        expect(results[0].triggerId).toBe(trigger.id);
        expect(Exit.isSuccess(results[0].result)).toBe(true);
      }, Effect.provide(TestTriggerDispatcherLayer)),
    );

    it.effect(
      'triggers are invoked one by one',
      Effect.fnUntraced(function* ({ expect }) {
        const queue = yield* QueueService.createQueue();
        const functionObj = serializeFunction(Example.reply);
        yield* DatabaseService.add(functionObj);
        const trigger = Trigger.make({
          function: Ref.make(functionObj),
          enabled: true,
          spec: {
            kind: 'queue',
            queue: queue.dxn.toString(),
          },
        });
        yield* DatabaseService.add(trigger);
        yield* QueueService.append(queue, [
          Obj.make(DataType.Person.Person, {
            fullName: 'John Doe',
          }),
          Obj.make(DataType.Person.Person, {
            fullName: 'Jane Smith',
          }),
        ]);

        const dispatcher = yield* TriggerDispatcher;

        {
          const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['queue'] });
          expect(results.length).toBe(1);
          expect(results[0].triggerId).toBe(trigger.id);
          expect(Exit.isSuccess(results[0].result)).toBe(true);
        }

        {
          const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['queue'] });
          expect(results.length).toBe(1);
          expect(results[0].triggerId).toBe(trigger.id);
          expect(Exit.isSuccess(results[0].result)).toBe(true);
        }

        {
          const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['queue'] });
          expect(results.length).toBe(0);
        }
      }, Effect.provide(TestTriggerDispatcherLayer)),
    );

    it.effect(
      'builds input from pattern',
      Effect.fnUntraced(function* ({ expect }) {
        const queue = yield* QueueService.createQueue();
        const functionObj = serializeFunction(Example.reply);
        yield* DatabaseService.add(functionObj);
        const trigger = Trigger.make({
          function: Ref.make(functionObj),
          enabled: true,
          spec: {
            kind: 'queue',
            queue: queue.dxn.toString(),
          },
          input: {
            instructions: 'Please process the queue item.',
            input: '{{event.item}}',
            triggerId: '{{trigger.id}}',
          },
        });
        yield* DatabaseService.add(trigger);
        const person = Obj.make(DataType.Person.Person, {
          fullName: 'John Doe',
        });
        yield* QueueService.append(queue, [person]);

        const dispatcher = yield* TriggerDispatcher;
        const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['queue'] });
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
      }, Effect.provide(TestTriggerDispatcherLayer)),
    );
  });

  describe('Database Triggers (Subscription)', () => {
    it.effect(
      'should invoke triggers on object creation',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = serializeFunction(Example.reply);
        yield* DatabaseService.add(functionObj);

        // Create a subscription trigger that watches for DataType.Person.Person objects
        const trigger = Trigger.make({
          function: Ref.make(functionObj),
          enabled: true,
          spec: {
            kind: 'subscription',
            query: {
              ast: Query.select(Filter.type(DataType.Person.Person)).ast,
            },
          },
        });
        yield* DatabaseService.add(trigger);

        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();

        // Create a new Person object - this should trigger the subscription
        const person = Obj.make(DataType.Person.Person, {
          fullName: 'Alice Smith',
        });
        yield* DatabaseService.add(person);

        // Invoke scheduled triggers to check if subscription fires
        const results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });

        // Should have triggered for the new person
        expect(results.length).toBe(1);
        expect(results[0].triggerId).toBe(trigger.id);
        expect(Exit.isSuccess(results[0].result)).toBe(true);
      }, Effect.provide(TestTriggerDispatcherLayer)),
    );

    it.effect(
      'should invoke triggers on object updates',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = serializeFunction(Example.reply);
        yield* DatabaseService.add(functionObj);

        // Create a person object first
        const person = Obj.make(DataType.Person.Person, {
          fullName: 'Bob Jones',
        });
        yield* DatabaseService.add(person);

        // Create a subscription trigger
        const trigger = Trigger.make({
          function: Ref.make(functionObj),
          enabled: true,
          spec: {
            kind: 'subscription',
            query: {
              ast: Query.select(Filter.type(DataType.Person.Person)).ast,
            },
          },
        });
        yield* DatabaseService.add(trigger);

        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();

        // Initial check - should trigger for existing object
        let results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
        expect(results.length).toBe(1);

        // Update the person object
        person.fullName = 'Robert Jones';
        yield* DatabaseService.flush();

        // Should trigger again for the update
        results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
        expect(results.length).toBe(1);
        expect(results[0].triggerId).toBe(trigger.id);
        expect(Exit.isSuccess(results[0].result)).toBe(true);
      }, Effect.provide(TestTriggerDispatcherLayer)),
    );

    it.effect(
      'should not invoke triggers for unchanged objects',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = serializeFunction(Example.reply);
        yield* DatabaseService.add(functionObj);

        // Create a subscription trigger first
        const trigger = Trigger.make({
          function: Ref.make(functionObj),
          enabled: true,
          spec: {
            kind: 'subscription',
            query: {
              ast: Query.select(Filter.type(DataType.Person.Person)).ast,
            },
          },
        });
        yield* DatabaseService.add(trigger);

        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();

        // Create a person object
        const person = Obj.make(DataType.Person.Person, {
          fullName: 'Charlie Brown',
        });
        yield* DatabaseService.add(person);

        // First invocation - should trigger for new object
        let results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
        expect(results.length).toBe(1);

        // Second invocation without any changes - should not trigger
        results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
        expect(results.length).toBe(0);

        // Update the object
        person.fullName = 'Charles Brown';
        yield* DatabaseService.flush();

        // Third invocation - should trigger for the update
        results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
        expect(results.length).toBe(1);

        // Fourth invocation without changes - should not trigger
        results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
        expect(results.length).toBe(0);
      }, Effect.provide(TestTriggerDispatcherLayer)),
    );

    it.effect(
      'should handle multiple object types with filters',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = serializeFunction(Example.reply);
        yield* DatabaseService.add(functionObj);

        // Create a subscription trigger that only watches for DataType.Task.Task objects
        const trigger = Trigger.make({
          function: Ref.make(functionObj),
          enabled: true,
          spec: {
            kind: 'subscription',
            query: {
              ast: Query.select(Filter.type(DataType.Task.Task)).ast,
            },
          },
        });
        yield* DatabaseService.add(trigger);

        const dispatcher = yield* TriggerDispatcher;
        yield* dispatcher.refreshTriggers();

        // Create a Person object - should NOT trigger
        const person = Obj.make(DataType.Person.Person, {
          fullName: 'David Wilson',
        });
        yield* DatabaseService.add(person);

        let results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
        expect(results.length).toBe(0);

        // Create a Task object - should trigger
        const task = Obj.make(DataType.Task.Task, {
          title: 'Important task',
        });
        yield* DatabaseService.add(task);

        results = yield* dispatcher.invokeScheduledTriggers({ kinds: ['subscription'] });
        expect(results.length).toBe(1);
        expect(results[0].triggerId).toBe(trigger.id);
        expect(Exit.isSuccess(results[0].result)).toBe(true);
      }, Effect.provide(TestTriggerDispatcherLayer)),
    );

    it.effect(
      'should pass correct event data to function',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = serializeFunction(Example.reply);
        yield* DatabaseService.add(functionObj);

        const person = Obj.make(DataType.Person.Person, {
          fullName: 'Eva Martinez',
        });
        yield* DatabaseService.add(person);

        // Create a subscription trigger with input pattern
        const trigger = Trigger.make({
          function: Ref.make(functionObj),
          enabled: true,
          spec: {
            kind: 'subscription',
            query: {
              ast: Query.select(Filter.type(DataType.Person.Person)).ast,
            },
          },
          input: {
            objectId: '{{event.changedObjectId}}',
            changeType: '{{event.type}}',
            triggerId: '{{trigger.id}}',
          },
        });
        yield* DatabaseService.add(trigger);

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
      }, Effect.provide(TestTriggerDispatcherLayer)),
    );
  });
});
