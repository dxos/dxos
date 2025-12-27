//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { log } from '@dxos/log';

import { ToolId } from './tool';
import { ToolExecutionService } from './tool-execution-service';
import { ToolResolverService } from './tool-resolver-service';

const TestToolResolverService = Layer.sync(ToolResolverService, () => ({
  resolve: (_id: ToolId) =>
    Effect.succeed(
      Tool.make('Calculator', {
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
  handlersFor: <Tools extends Record<string, Tool.Any>>(toolkit: Toolkit.Toolkit<Tools>) =>
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

        const toolkit = Toolkit.merge(dynamicToolkit, UserToolkit);
        const results = Effect.gen(function* () {
          return {
            sum: yield* callTool(toolkit, 'Calculator', { input: '1 + 1' }),
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

const callTool = <Tools extends Record<string, Tool.Any>, Name extends keyof Tools>(
  toolkit: Toolkit.Toolkit<Tools>,
  toolName: Name,
  toolProps: Tool.Parameters<Tools[Name]> extends never ? unknown : Tool.Parameters<Tools[Name]>,
): Effect.Effect<Tool.Success<Tools[Name]>, Tool.Failure<Tools[Name]>, Tool.Requirements<Tools[Name]>> =>
  toolkit.pipe(Effect.flatMap((h: any) => h.handle(toolName, toolProps) as Effect.Effect<any, any, any>));
