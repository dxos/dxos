//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import { Effect, Layer, pipe, Schema, Duration, Exit } from 'effect';

import { AiService } from '@dxos/ai';
import { Obj, Ref, Type } from '@dxos/echo';
import { FetchHttpClient } from '@effect/platform';
import { default as reply } from '../examples/reply';
import { type FunctionDefinition, serializeFunction } from '../handler';
import { FunctionType } from '../schema';
import {
  ComputeEventLogger,
  CredentialsService,
  DatabaseService,
  RemoteFunctionExecutionService,
  TracingService,
} from '../services';
import { FunctionImplementationResolver, LocalFunctionExecutionService } from '../services/local-function-execution';
import { TestDatabaseLayer } from '../testing';
import { FunctionTrigger } from '../types';
import { TriggerDispatcher } from './trigger-dispatcher';

const TestLayer = pipe(
  Layer.mergeAll(ComputeEventLogger.layerFromTracing),
  Layer.provideMerge(
    Layer.mergeAll(
      AiService.notAvailable,
      TestDatabaseLayer({
        types: [FunctionType, FunctionTrigger],
      }),
      CredentialsService.layerConfig([]),
      LocalFunctionExecutionService.layerLive,
      RemoteFunctionExecutionService.mockLayer,
      TracingService.layerLogInfo(),
      FetchHttpClient.layer,
    ),
  ),
  Layer.provideMerge(FunctionImplementationResolver.layerTest({ functions: [reply] })),
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
        const functionObj = serializeFunction(reply);
        yield* DatabaseService.add(functionObj);
        const trigger = Obj.make(FunctionTrigger, {
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
          data: { custom: 'data' },
        });

        expect(result).toEqual(Exit.succeed({ custom: 'data' }));
      }, Effect.provide(TestTriggerDispatcherLayer)),
    );
  });

  describe('Timer Triggers', () => {
    it.effect(
      'should invoke scheduled timer triggers',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = serializeFunction(reply);
        yield* DatabaseService.add(functionObj);
        const trigger = Obj.make(FunctionTrigger, {
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
        const results = yield* dispatcher.invokeScheduledTriggers();

        // Should have executed successfully
        expect(results.length).toBe(1);
        expect(results[0].triggerId).toBe(trigger.id);
        expect(Exit.isSuccess(results[0].result)).toBe(true);
      }, Effect.provide(TestTriggerDispatcherLayer)),
    );

    it.effect(
      'should handle disabled triggers',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = serializeFunction(reply);
        yield* DatabaseService.add(functionObj);

        const enabledTrigger = Obj.make(FunctionTrigger, {
          function: Ref.make(functionObj),
          enabled: true,
          spec: {
            kind: 'timer',
            cron: '* * * * *',
          },
        });

        const disabledTrigger = Obj.make(FunctionTrigger, {
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
        const results = yield* dispatcher.invokeScheduledTriggers();

        // Enabled should succeed
        expect(results.length).toBe(1);
        expect(results[0].triggerId).toBe(enabledTrigger.id);
        expect(Exit.isSuccess(results[0].result)).toBe(true);
      }, Effect.provide(TestTriggerDispatcherLayer)),
    );

    it.effect(
      'cron triggers are invoked periodically on schedule',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = serializeFunction(reply);
        yield* DatabaseService.add(functionObj);

        // cron every 5 minutes
        const trigger = Obj.make(FunctionTrigger, {
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
        let results = yield* dispatcher.invokeScheduledTriggers();
        expect(results.length).toBe(0);

        // advance 4 more minutes; now = 15:06 -- trigger should be invoked
        yield* dispatcher.advanceTime(Duration.minutes(4));
        results = yield* dispatcher.invokeScheduledTriggers();
        expect(results.length).toBe(1);

        // advance 2 more minutes; now = 15:08 -- trigger should not be invoked
        yield* dispatcher.advanceTime(Duration.minutes(2));
        results = yield* dispatcher.invokeScheduledTriggers();
        expect(results.length).toBe(0);

        // advance 3 more minutes; now = 15:11 -- trigger should be invoked
        yield* dispatcher.advanceTime(Duration.minutes(3));
        results = yield* dispatcher.invokeScheduledTriggers();
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
        const functionObj = serializeFunction(reply);
        yield* DatabaseService.add(functionObj);
        const trigger = Obj.make(FunctionTrigger, {
          function: Ref.make(functionObj),
          enabled: true,
          spec: {
            kind: 'timer',
            cron: '* * * * *', // Every minute
          },
        });
        yield* DatabaseService.add(trigger);

        // Can invoke the trigger
        const result = yield* dispatcher.invokeTrigger({ trigger });
        expect(Exit.isSuccess(result.result)).toBe(true);
      }, Effect.provide(TestTriggerDispatcherLayer)),
    );
  });

  describe('Error Handling', () => {
    it.effect(
      'should handle missing function reference',
      Effect.fnUntraced(function* ({ expect }) {
        const dispatcher = yield* TriggerDispatcher;

        // Create trigger without function reference
        const trigger = Obj.make(FunctionTrigger, {
          function: undefined,
          enabled: true,
          spec: {
            kind: 'timer',
            cron: '* * * * *',
          },
        });

        // Should die with message
        const result = yield* dispatcher.invokeTrigger({ trigger }).pipe(
          Effect.map(() => 'success'),
          Effect.catchAllDefect(() => Effect.succeed('died')),
        );

        expect(result).toBe('died');
      }, Effect.provide(TestTriggerDispatcherLayer)),
    );
  });

  describe('Cron Patterns', () => {
    it.effect(
      'should support Effect cron expressions',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = serializeFunction(reply);
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
          const trigger = Obj.make(FunctionTrigger, {
            function: Ref.make(functionObj),
            enabled: true,
            spec: {
              kind: 'timer',
              cron,
            },
          });
          yield* DatabaseService.add(trigger);

          const result = yield* dispatcher.invokeTrigger({ trigger });
          expect(Exit.isSuccess(result.result)).toBe(true);
        }
      }, Effect.provide(TestTriggerDispatcherLayer)),
    );

    it.effect(
      'should handle invalid cron expressions gracefully',
      Effect.fnUntraced(function* ({ expect }) {
        const functionObj = serializeFunction(reply);
        yield* DatabaseService.add(functionObj);

        // Test with an invalid pattern
        const trigger = Obj.make(FunctionTrigger, {
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
        const result = yield* dispatcher.invokeScheduledTriggers();
        expect(result.length).toBe(0);
      }, Effect.provide(TestTriggerDispatcherLayer)),
    );
  });
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
