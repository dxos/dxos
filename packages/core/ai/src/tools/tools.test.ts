//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { log } from '@dxos/log';

import { CalculatorLayer, CalculatorTool, CalculatorToolkit, calculatorHandler } from '../testing/calculator';
import { callTool } from './call';
import { ToolId } from './tool';
import { ToolExecutionService } from './tool-execution-service';
import { ToolResolverService } from './tool-resolver-service';

const TestToolResolverService = Layer.sync(ToolResolverService, () => ({
  resolve: (_id: ToolId) => Effect.succeed(CalculatorTool),
}));

const TestToolExecutionService = Layer.sync(ToolExecutionService, () => ({
  handlersFor: <Tools extends Record<string, Tool.Any>>(toolkit: Toolkit.Toolkit<Tools>) =>
    toolkit.of({
      Calculator: calculatorHandler,
    } as any),
}));

const UserToolkit = Toolkit.make(
  Tool.make('test/age', {
    description: 'Gets the age of the user',
    parameters: {},
    success: Schema.Number,
  }),
);

const userToolkitLayer = UserToolkit.toLayer({
  'test/age': Effect.fn(function* () {
    return 21;
  }),
});

describe('ToolResolverService', () => {
  it.effect(
    'should resolve a tool',
    Effect.fn(
      function* () {
        const dynamicToolkit = yield* ToolResolverService.resolveToolkit([ToolId.make('test')]);
        const dynamicToolkitLayer = dynamicToolkit.toLayer(
          yield* ToolExecutionService.handlersFor(dynamicToolkit) as Effect.Effect<any, never, ToolExecutionService>,
        );

        const toolkit = yield* Toolkit.merge(dynamicToolkit, UserToolkit).pipe(
          Effect.provide(Layer.mergeAll(dynamicToolkitLayer, userToolkitLayer)),
        );
        const results = Effect.gen(function* () {
          return {
            sum: yield* callTool(toolkit, {
              _tag: 'toolCall',
              toolCallId: '1',
              name: 'Calculator',
              input: JSON.stringify({ input: '1 + 1' }),
              providerExecuted: false,
            }),
            age: yield* callTool(toolkit, {
              _tag: 'toolCall',
              toolCallId: '2',
              name: 'test/age',
              input: JSON.stringify({}),
              providerExecuted: false,
            }),
          };
        });
        const result = yield* results.pipe();
        log.info('result', { result });
      },
      Effect.provide(TestToolResolverService),
      Effect.provide(TestToolExecutionService),
    ),
  );

  it.effect(
    'succesfull callTool',
    Effect.fn(
      function* () {
        const toolkit = yield* CalculatorToolkit.pipe(Effect.provide(CalculatorLayer));
        const result = yield* callTool(toolkit, {
          _tag: 'toolCall',
          toolCallId: '1',
          name: 'Calculator',
          input: JSON.stringify({ input: '1 + 1' }),
          providerExecuted: false,
        });
        expect(result).toEqual({
          _tag: 'toolResult',
          toolCallId: '1',
          name: 'Calculator',
          result: '{"result":2}',
          providerExecuted: false,
        });
      },
      Effect.provide(TestToolResolverService),
      Effect.provide(TestToolExecutionService),
    ),
  );

  it.effect(
    'failing callTool',
    Effect.fn(
      function* () {
        const toolkit = yield* CalculatorToolkit.pipe(Effect.provide(CalculatorLayer));
        const result = yield* callTool(toolkit, {
          _tag: 'toolCall',
          toolCallId: '1',
          name: 'Calculator',
          input: JSON.stringify({ input: 'not a number' }),
          providerExecuted: false,
        });
        expect(result).toEqual({
          _tag: 'toolResult',
          toolCallId: '1',
          name: 'Calculator',
          error: "SyntaxError: Unexpected token ')'",
          providerExecuted: false,
        });
      },
      Effect.provide(TestToolResolverService),
      Effect.provide(TestToolExecutionService),
    ),
  );
});
