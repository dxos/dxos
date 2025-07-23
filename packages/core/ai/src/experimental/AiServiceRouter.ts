//
// Copyright 2025 DXOS.org
//

import { type AiLanguageModel } from '@effect/ai';
import { AnthropicClient, AnthropicLanguageModel } from '@effect/ai-anthropic';
import { OpenAiClient, OpenAiLanguageModel } from '@effect/ai-openai';
import { Context, Effect, Layer, Option } from 'effect';

import { AiModelNotAvailableError } from '../errors';
import { AiService } from '../service';
import { type LLMModel as ModelName } from '../types';

const LmStudioClient = OpenAiClient.layer({
  apiUrl: 'http://localhost:1234/v1',
});

// TODO(dmaretskyi): Make this generic.
export const AiServiceRouter = Layer.effect(
  AiService,
  Effect.gen(function* () {
    const anthropicClient = Layer.succeed(AnthropicClient.AnthropicClient, yield* AnthropicClient.AnthropicClient);

    // TODO(dmaretskyi): If this is pushed into requirements this will conflict with the real OpenAiClient.
    const lmStudioClient = Layer.succeed(
      OpenAiClient.OpenAiClient,
      yield* OpenAiClient.OpenAiClient.pipe(Effect.provide(LmStudioClient)),
    );

    return AiService.of({
      model: (model) => {
        switch (model) {
          case '@anthropic/claude-3-5-sonnet-20241022':
            return AnthropicLanguageModel.model('claude-3-5-sonnet-20241022').pipe(Layer.provide(anthropicClient));
          case '@google/gemma-3-12b':
            // No standard model name.
            return OpenAiLanguageModel.model('google/gemma-3-12b' as any).pipe(Layer.provide(lmStudioClient));
          default:
            return Layer.fail(new AiModelNotAvailableError(model));
        }
      },
    });
  }),
);

export class AiModelResolver extends Context.Tag('AiModelResolver')<
  AiModelResolver,
  {
    readonly model: (model: ModelName) => Layer.Layer<AiLanguageModel.AiLanguageModel, AiModelNotAvailableError, never>;
  }
>() {
  static buildAiService: Layer.Layer<AiService, never, AiModelResolver> = Layer.effect(
    AiService,
    Effect.gen(function* () {
      const resolver = yield* AiModelResolver;
      return {
        model: (name) => resolver.model(name),
      } satisfies Context.Tag.Service<AiService>;
    }),
  );

  static resolver = <R>(
    impl: Effect.Effect<
      (model: ModelName) => Layer.Layer<AiLanguageModel.AiLanguageModel, AiModelNotAvailableError, never>,
      never,
      R
    >,
  ): Layer.Layer<AiModelResolver, never, R> =>
    Layer.effect(
      AiModelResolver,
      Effect.gen(function* () {
        const getModel = yield* impl;
        const upstream = yield* Effect.serviceOption(AiModelResolver);
        return {
          model: (name) =>
            getModel(name).pipe(
              Layer.catchAll(() => {
                if (Option.isSome(upstream)) {
                  return upstream.value.model(name);
                } else {
                  return Layer.fail(new AiModelNotAvailableError(name));
                }
              }),
            ),
        };
      }),
    );
}
