//
// Copyright 2025 DXOS.org
//

import { type AiLanguageModel, type AiModel } from '@effect/ai';
import { AnthropicClient, AnthropicLanguageModel } from '@effect/ai-anthropic';
import { OpenAiClient, OpenAiLanguageModel } from '@effect/ai-openai';
import { Context, Effect, Layer, Option } from 'effect';

import { AiModelNotAvailableError } from '../errors';
import { AiService } from '../service';
import { type LLMModel as ModelName } from '../types';

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

  static fromModelMap = <R>(
    models: Effect.Effect<
      Partial<Record<ModelName, Layer.Layer<AiLanguageModel.AiLanguageModel, AiModelNotAvailableError, never>>>,
      never,
      R
    >,
  ): Layer.Layer<AiModelResolver, never, R> =>
    AiModelResolver.resolver(
      models.pipe(
        Effect.map((models) => (name: ModelName) => models[name] ?? Layer.fail(new AiModelNotAvailableError(name))),
      ),
    );
}

export const AnthropicResolver = AiModelResolver.fromModelMap(
  Effect.gen(function* () {
    return {
      '@anthropic/claude-3-5-sonnet-20241022': yield* AnthropicLanguageModel.model('claude-3-5-sonnet-20241022'),
      '@anthropic/claude-3-5-haiku-20241022': yield* AnthropicLanguageModel.model('claude-3-5-haiku-20241022'),
      '@anthropic/claude-3-5-haiku-latest': yield* AnthropicLanguageModel.model('claude-3-5-haiku-latest'),
      '@anthropic/claude-sonnet-4-0': yield* AnthropicLanguageModel.model('claude-sonnet-4-0'),
      '@anthropic/claude-opus-4-0': yield* AnthropicLanguageModel.model('claude-opus-4-0'),
    };
  }),
);

/** @internal */
export const LMSTUDIO_ENDPOINT = 'http://localhost:1234/v1';

export const LMStudioResolver = AiModelResolver.fromModelMap(
  Effect.gen(function* () {
    return {
      // TODO(dmaretskyi): Add more LMStudio models.
      '@google/gemma-3-12b': yield* OpenAiLanguageModel.model('google/gemma-3-12b' as any),
    };
  }).pipe(
    Effect.provide(
      OpenAiClient.layer({
        apiUrl: LMSTUDIO_ENDPOINT,
      }),
    ),
  ),
);

export const OpenAiResolver = AiModelResolver.fromModelMap(
  Effect.gen(function* () {
    return {
      '@openai/gpt-4o': yield* OpenAiLanguageModel.model('gpt-4o'),
      '@openai/gpt-4o-mini': yield* OpenAiLanguageModel.model('gpt-4o-mini'),
      '@openai/o1': yield* OpenAiLanguageModel.model('o1'),
      '@openai/o3': yield* OpenAiLanguageModel.model('o3'),
      '@openai/o3-mini': yield* OpenAiLanguageModel.model('o3-mini'),
    };
  }),
);

export const AiServiceRouter = AiModelResolver.buildAiService.pipe(
  Layer.provide(AnthropicResolver),
  Layer.provide(LMStudioResolver),
  Layer.provide(OpenAiResolver),
);
