//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import { Effect, Layer, pipe, Schema } from 'effect';

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

describe('TriggerDispatcher', () => {
  describe('Manual Invocation', () => {
    it.effect.only(
      'should manually invoke trigger',
      Effect.fnUntraced(
        function* ({ expect }) {
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

          expect(result).toEqual({ custom: 'data' });
        },
        Effect.provide(Layer.provideMerge(TriggerDispatcher.layer({ timeControl: 'manual' }), TestLayer)),
      ),
    );
  });

  // describe('Timer Triggers', () => {
  //   test('should add and schedule timer triggers', async () => {
  //     const trigger = createTestTrigger('trigger-1', '0 * * * *'); // Every hour

  //     const options: TriggerDispatcherOptions = {
  //       database: createMockDatabase(),
  //       timeControl: 'manual',
  //       triggers: [trigger],
  //     };

  //     await runTest(options, (dispatcher) =>
  //       Effect.gen(function* () {
  //         yield* dispatcher.start();

  //         const executionResults: any[] = [];

  //         // Mock function execution
  //         const mockFunctionDef = createTestFunctionDef('test-function', (data) => {
  //           executionResults.push(data);
  //           return { result: 'success' };
  //         });

  //         // Override the resolver to return our mock function
  //         dispatcher._resolveFunctionDefinition = () => Effect.succeed(mockFunctionDef);

  //         // Invoke scheduled triggers (should execute immediately since time matches)
  //         yield* dispatcher.invokeScheduledTriggers();

  //         expect(executionResults).toHaveLength(1);
  //         expect(executionResults[0]).toHaveProperty('tick');
  //       }),
  //     );
  //   });

  //   test('should respect cron schedules', async () => {
  //     const trigger = createTestTrigger('trigger-1', '0,5,10,15,20,25,30,35,40,45,50,55 * * * *'); // Every 5 minutes

  //     const options: TriggerDispatcherOptions = {
  //       database: createMockDatabase(),
  //       timeControl: 'manual',
  //       triggers: [trigger],
  //     };

  //     await runTest(options, (dispatcher) =>
  //       Effect.gen(function* () {
  //         yield* dispatcher.start();

  //         const executionResults: any[] = [];
  //         const mockFunctionDef = createTestFunctionDef('test-function', (data) => {
  //           executionResults.push(data);
  //           return { result: 'success' };
  //         });

  //         dispatcher._resolveFunctionDefinition = () => Effect.succeed(mockFunctionDef);

  //         // First execution at minute 0
  //         yield* dispatcher.invokeScheduledTriggers();
  //         expect(executionResults).toHaveLength(1);

  //         // Advance 3 minutes - should not trigger
  //         yield* dispatcher.advanceTime(Duration.minutes(3));
  //         yield* dispatcher.invokeScheduledTriggers();
  //         expect(executionResults).toHaveLength(1);

  //         // Advance 2 more minutes (total 5) - should trigger
  //         yield* dispatcher.advanceTime(Duration.minutes(2));
  //         yield* dispatcher.invokeScheduledTriggers();
  //         expect(executionResults).toHaveLength(2);
  //       }),
  //     );
  //   });

  //   test('should handle disabled triggers', async () => {
  //     const triggers = [
  //       createTestTrigger('trigger-1', '* * * * *', true),
  //       createTestTrigger('trigger-2', '* * * * *', false), // Disabled
  //     ];

  //     const options: TriggerDispatcherOptions = {
  //       database: createMockDatabase(),
  //       timeControl: 'manual',
  //       triggers,
  //     };

  //     await runTest(options, (dispatcher) =>
  //       Effect.gen(function* () {
  //         yield* dispatcher.start();

  //         const executionResults: string[] = [];
  //         const mockFunctionDef = createTestFunctionDef('test-function', (data) => {
  //           executionResults.push(data.triggerId);
  //           return { result: 'success' };
  //         });

  //         dispatcher._resolveFunctionDefinition = () => Effect.succeed(mockFunctionDef);
  //         dispatcher._prepareInputData = (trigger: FunctionTrigger) => ({
  //           triggerId: trigger.id,
  //         });

  //         yield* dispatcher.invokeScheduledTriggers();

  //         // Only enabled trigger should execute
  //         expect(executionResults).toEqual(['trigger-1']);
  //       }),
  //     );
  //   });
  // });

  // describe('Dynamic Trigger Management', () => {
  //   test('should add triggers dynamically', async () => {
  //     const options: TriggerDispatcherOptions = {
  //       database: createMockDatabase(),
  //       timeControl: 'manual',
  //       triggers: [],
  //     };

  //     await runTest(options, (dispatcher) =>
  //       Effect.gen(function* () {
  //         yield* dispatcher.start();

  //         const executionResults: string[] = [];
  //         const mockFunctionDef = createTestFunctionDef('test-function', (data) => {
  //           executionResults.push(data.triggerId);
  //           return { result: 'success' };
  //         });

  //         dispatcher._resolveFunctionDefinition = () => Effect.succeed(mockFunctionDef);
  //         dispatcher._prepareInputData = (trigger: FunctionTrigger) => ({
  //           triggerId: trigger.id,
  //         });

  //         // No triggers initially
  //         yield* dispatcher.invokeScheduledTriggers();
  //         expect(executionResults).toHaveLength(0);

  //         // Add a trigger
  //         dispatcher.addTriggers([createTestTrigger('dynamic-1', '* * * * *')]);
  //         yield* dispatcher.invokeScheduledTriggers();
  //         expect(executionResults).toEqual(['dynamic-1']);

  //         // Add another trigger
  //         dispatcher.addTriggers([
  //           createTestTrigger('dynamic-1', '* * * * *'), // Keep existing
  //           createTestTrigger('dynamic-2', '* * * * *'), // Add new
  //         ]);

  //         executionResults.length = 0; // Clear results
  //         yield* dispatcher.invokeScheduledTriggers();
  //         expect(executionResults).toContain('dynamic-1');
  //         expect(executionResults).toContain('dynamic-2');
  //         expect(executionResults).toHaveLength(2);
  //       }),
  //     );
  //   });
  // });

  // describe('Error Handling', () => {
  //   test('should handle function execution errors', async () => {
  //     const trigger = createTestTrigger('trigger-1', '* * * * *');

  //     const options: TriggerDispatcherOptions = {
  //       database: createMockDatabase(),
  //       timeControl: 'manual',
  //       triggers: [trigger],
  //     };

  //     await runTest(options, (dispatcher) =>
  //       Effect.gen(function* () {
  //         yield* dispatcher.start();

  //         const mockFunctionDef = createTestFunctionDef('test-function', () => {
  //           throw new Error('Function execution error');
  //         });

  //         dispatcher._resolveFunctionDefinition = () => Effect.succeed(mockFunctionDef);

  //         // Should not throw, errors are logged
  //         yield* dispatcher.invokeScheduledTriggers();
  //       }),
  //     );
  //   });

  //   test('should reject advanceTime in natural mode', async () => {
  //     const options: TriggerDispatcherOptions = {
  //       database: createMockDatabase(),
  //       timeControl: 'natural',
  //     };

  //     await runTest(options, (dispatcher) =>
  //       Effect.gen(function* () {
  //         const result = yield* dispatcher.advanceTime(Duration.hours(1)).pipe(
  //           Effect.map(() => 'success'),
  //           Effect.orElseSucceed(() => 'failed'),
  //         );

  //         expect(result).toBe('failed');
  //       }),
  //     );
  //   });
  // });

  // describe('Cron Patterns', () => {
  //   test('should support Effect cron expressions', async () => {
  //     const validPatterns = [
  //       '* * * * *', // Every minute
  //       '0 * * * *', // Every hour
  //       '0 0 * * *', // Daily
  //       '0 0 * * 1', // Every Monday
  //       '0 9-17 * * *', // Every hour from 9 AM to 5 PM
  //     ];

  //     const options: TriggerDispatcherOptions = {
  //       database: createMockDatabase(),
  //       timeControl: 'manual',
  //       triggers: [],
  //     };

  //     await runTest(options, (dispatcher) =>
  //       Effect.gen(function* () {
  //         // Test that valid patterns are accepted
  //         validPatterns.forEach((cron) => {
  //           const trigger = createTestTrigger(`test-${cron}`, cron);
  //           dispatcher.addTriggers([trigger]);
  //         });

  //         // Verify all triggers were added
  //         const internalTriggers = dispatcher._scheduledTriggers;
  //         expect(internalTriggers.size).toBe(validPatterns.length);
  //       }),
  //     );
  //   });

  //   test('should reject invalid cron expressions', async () => {
  //     const invalidPatterns = [
  //       'invalid',
  //       '60 * * * *', // Invalid minute (0-59)
  //       '* 25 * * *', // Invalid hour (0-23)
  //       '* * 32 * *', // Invalid day (1-31)
  //       '* * * 13 *', // Invalid month (1-12)
  //     ];

  //     const options: TriggerDispatcherOptions = {
  //       database: createMockDatabase(),
  //       timeControl: 'manual',
  //       triggers: [],
  //     };

  //     await runTest(options, (dispatcher) =>
  //       Effect.gen(function* () {
  //         // Test that invalid patterns are rejected
  //         invalidPatterns.forEach((cron) => {
  //           const trigger = createTestTrigger(`test-${cron}`, cron);
  //           dispatcher.addTriggers([trigger]);
  //         });

  //         // Verify no triggers were added
  //         const internalTriggers = dispatcher._scheduledTriggers;
  //         expect(internalTriggers.size).toBe(0);
  //       }),
  //     );
  //   });
  // });

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
});
