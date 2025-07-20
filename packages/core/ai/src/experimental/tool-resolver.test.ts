import { describe, it } from '@effect/vitest';
import { AiTool, AiToolkit } from '@effect/ai';
import { Context, Effect, Layer, Schema } from 'effect';
import { BaseError } from '@dxos/errors';
import { log } from '@dxos/log';

export const ToolId = Schema.String.pipe(Schema.brand('ToolId'));
export type ToolId = Schema.Schema.Type<typeof ToolId>;

export class AiToolNotFoundError extends BaseError.extend('AI_TOOL_NOT_FOUND') {}

export class ToolResolverService extends Context.Tag('ToolResolverService')<
  ToolResolverService,
  {
    readonly resolve: (id: ToolId) => Effect.Effect<AiTool.Any, AiToolNotFoundError>;
  }
>() {
  static resolve = Effect.serviceFunctionEffect(ToolResolverService, (_) => _.resolve);

  static resolveToolkit: (
    ids: ToolId[],
  ) => Effect.Effect<AiToolkit.AiToolkit<AiTool.Any>, AiToolNotFoundError, ToolResolverService> = (ids) =>
    Effect.gen(function* () {
      const tools = yield* Effect.all(ids.map(ToolResolverService.resolve));
      return AiToolkit.make(...tools);
    });
}

export class ToolExecutionService extends Context.Tag('ToolExecutionService')<
  ToolExecutionService,
  {
    readonly toolkitLayer: <Tools extends AiTool.Any>(
      toolkit: AiToolkit.AiToolkit<Tools>,
    ) => Layer.Layer<AiTool.ToHandler<Tools>, never, never>;
  }
>() {
  static toolkitLayer = <Tools extends AiTool.Any>(toolkit: AiToolkit.AiToolkit<Tools>) =>
    Layer.unwrapEffect(ToolExecutionService.pipe(Effect.map((_) => _.toolkitLayer(toolkit))));
}

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
  toolkitLayer: <Tools extends AiTool.Any>(toolkit: AiToolkit.AiToolkit<Tools>) =>
    toolkit.toLayer({
      Calculator: Effect.fn(function* ({ input }) {
        const result = (() => {
          // Restrict to basic arithmetic operations for safety.
          const sanitizedInput = input.replace(/[^0-9+\-*/().\s]/g, '');
          log.info('calculate', { sanitizedInput });

          // eslint-disable-next-line no-new-func
          return Function(`"use strict"; return (${sanitizedInput})`)();
        })();

        return { result };
      }),
    } as any),
}));

describe('ToolResolverService', () => {
  it.effect(
    'should resolve a tool',
    Effect.fn(
      function* () {
        const toolkit = yield* ToolResolverService.resolveToolkit([ToolId.make('test')]);
        log.info('toolkit', { toolkit });

        const result = yield* toolkit.pipe(
          Effect.flatMap((h: any) => h.handle('Calculator', { input: '1 + 1' }) as Effect.Effect<any, any, any>),
          Effect.provide(ToolExecutionService.toolkitLayer(toolkit)),
        );
        log.info('result', { result });
      },
      Effect.provide(TestToolResolverService),
      Effect.provide(TestToolExecutionService),
    ),
  );
});
