//
// Copyright 2025 DXOS.org
//

import * as Test from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';

import { defineFunction } from '../handler';
import { TestDatabaseLayer } from '../testing';

import { FunctionInvocationService } from './function-invocation-service';
import { FunctionImplementationResolver } from './local-function-execution';

const TestLayer = Layer.mergeAll(AiService.model('@anthropic/claude-opus-4-0')).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      TestDatabaseLayer({
        indexing: { vector: true },
        types: [],
      }),
      FunctionInvocationService.layer,
    ),
  ),
);

Test.describe('FunctionInvocationService', () => {
  Test.it(
    'should be defined',
    Effect.fnUntraced(function* () {
      const service = yield* FunctionInvocationService;
      Test.expect(service).toBeDefined();
    }, Effect.provide(TestLayer)),
  );

  Test.it(
    'routes to local when implementation is available',
    Effect.fnUntraced(function* () {
      const add = defineFunction({
        key: 'example.org/function/add',
        name: 'add',
        inputSchema: Schema.Struct({ a: Schema.Number, b: Schema.Number }),
        outputSchema: Schema.Number,
        handler: ({ data }) => data.a + data.b,
      });

      const layer = TestLayer.pipe(Layer.provideMerge(FunctionImplementationResolver.layerTest({ functions: [add] })));

      const result = yield* Effect.gen(function* () {
        return yield* FunctionInvocationService.invokeFunction(add, { a: 2, b: 3 });
      }).pipe(Effect.provide(layer));

      Test.expect(result).toEqual(5);
    }),
  );

  Test.it(
    'routes to remote when no local implementation is found',
    Effect.fnUntraced(function* () {
      // This function is not deployed, so mock layer will be used.
      const echo = defineFunction({
        key: 'example.org/function/echo',
        name: 'function-that-is-deployed',
        inputSchema: Schema.Unknown,
        outputSchema: Schema.Unknown,
        handler: () => {},
      });

      // No resolver provided → resolveFunctionImplementation will fail → remote path is used.
      const result = yield* Effect.gen(function* () {
        return yield* FunctionInvocationService.invokeFunction(echo, { hello: 'world' });
      }).pipe(Effect.provide(TestLayer));

      // RemoteFunctionExecutionService.mock echos input back.
      Test.expect(result).toEqual({ hello: 'world', resolved: 'remote' });
    }),
  );
});
