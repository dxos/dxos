//
// Copyright 2025 DXOS.org
//

import { AiTool, AiToolkit } from '@effect/ai';
import { describe, it } from '@effect/vitest';
import { Effect, Layer, Schema } from 'effect';

import { log } from '@dxos/log';

import { ToolId } from './tool';
import { ToolExecutionService } from './tool-execution-service';
import { ToolResolverService } from './tool-resolver-service';

const TestToolResolverService = Layer.sync(ToolResolverService, () => ({
  resolve: (id: ToolId) =>
    Effect.succeed(
      AiTool.make('Calculator', {
        description: 'Basic calculator tool',
        parameters: {
          input: Schema.String.annotations({
            description: 'The calculation to perform.',
          }),
        },
        success: Schema.Struct({
          result: Schema.Number,
        }),
        failure: Schema.Never,
      }),
    ),
}));

const TestToolExecutionService = Layer.sync(ToolExecutionService, () => ({
  handlersFor: <Tools extends AiTool.Any>(toolkit: AiToolkit.AiToolkit<Tools>) =>
    toolkit.of({
      Calculator: Effect.fn(function* ({ input }) {
        const result = (() => {
          // Restrict to basic arithmetic operations for safety.
          const sanitizedInput = input.replace(/[^0-9+\-*/().\s]/g, '');
          log.info('calculate', { sanitizedInput });

          // eslint-disable-next-line @typescript-eslint/no-implied-eval
          return Function(`"use strict"; return (${sanitizedInput})`)();
        })();

        return { result };
      }),
    } as any),
}));

class UserToolkit extends AiToolkit.make(
  AiTool.make('test/age', {
    description: 'Gets the age of the user',
    parameters: {},
    success: Schema.Number,
  }),
) {}

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

        const toolkit = AiToolkit.merge(dynamicToolkit, UserToolkit);

        const results = Effect.gen(function* () {
          return {
            sum: yield* callTool(toolkit, 'Calculator' as any, { input: '1 + 1' }),
            age: yield* callTool(toolkit, 'test/age', {}),
          };
        });
        const result = yield* results.pipe(Effect.provide(Layer.mergeAll(dynamicToolkitLayer, userToolkitLayer)));
        log.info('result', { result });
      },
      Effect.provide(TestToolResolverService),
      Effect.provide(TestToolExecutionService),
    ),
  );
});

const callTool = <Tools extends AiTool.Any>(
  toolkit: AiToolkit.AiToolkit<Tools>,
  toolName: AiTool.Name<Tools>,
  toolParams: AiTool.Parameters<Tools>,
): Effect.Effect<AiTool.Success<Tools>, AiTool.Failure<Tools>, AiTool.Context<Tools>> =>
  toolkit.pipe(Effect.flatMap((h: any) => h.handle(toolName, toolParams) as Effect.Effect<any, any, any>));
