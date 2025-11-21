//
// Copyright 2025 DXOS.org
//

import type * as LanguageModel from '@effect/ai/LanguageModel';
import * as AnthropicLanguageModel from '@effect/ai-anthropic/AnthropicLanguageModel';
import * as OpenAiClient from '@effect/ai-openai/OpenAiClient';
import * as OpenAiLanguageModel from '@effect/ai-openai/OpenAiLanguageModel';
import type * as HttpClient from '@effect/platform/HttpClient';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { AiService } from './AiService';
import { type ModelName as ModelName } from './defs';
import { AiModelNotAvailableError } from './errors';

// TODO(burdon): Determine canoncical naming and resolution of different models by provider.
//  Consider: Base model (e.g., claude-opus-4-0), Provider (e.g., anhtropic), Registry (cloudflare), Runtime (dxos-remote).
//  Examples:
//  https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct                     => huggingface.co/meta-llama/Llama-3.2-3B-Instruct
//  https://developers.cloudflare.com/workers-ai/models/llama-3.2-3b-instruct   => cloudflare.com/llama-3.2-3b-instruct
//  https://ollama.com/library/llama3.2                                         => ollama.com/llama3.2

export class AiModelResolver extends Context.Tag('@dxos/ai/AiModelResolver')<
  AiModelResolver,
  {
    readonly model: (model: ModelName) => Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>;
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
      (model: ModelName) => Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>,
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
      Partial<Record<ModelName, Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>>>,
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
      '@anthropic/claude-3-5-haiku-latest': yield* AnthropicLanguageModel.model('claude-3-5-haiku-latest'),
      '@anthropic/claude-3-5-haiku-20241022': yield* AnthropicLanguageModel.model('claude-3-5-haiku-20241022'),
      '@anthropic/claude-3-5-sonnet-20241022': yield* AnthropicLanguageModel.model('claude-3-5-sonnet-20241022'),
      '@anthropic/claude-opus-4-0': yield* AnthropicLanguageModel.model('claude-opus-4-0'),
      '@anthropic/claude-haiku-4-5': yield* AnthropicLanguageModel.model('claude-haiku-4-5'),
      '@anthropic/claude-sonnet-4-0': yield* AnthropicLanguageModel.model('claude-sonnet-4-0'),
      '@anthropic/claude-sonnet-4-5': yield* AnthropicLanguageModel.model('claude-sonnet-4-5'),
    } satisfies Partial<Record<ModelName, Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>>>;
  }),
);

export const OpenAiResolver = AiModelResolver.fromModelMap(
  Effect.gen(function* () {
    return {
      '@openai/gpt-4o': yield* OpenAiLanguageModel.model('gpt-4o'),
      '@openai/gpt-4o-mini': yield* OpenAiLanguageModel.model('gpt-4o-mini'),
      '@openai/o1': yield* OpenAiLanguageModel.model('o1'),
      '@openai/o3': yield* OpenAiLanguageModel.model('o3'),
      '@openai/o3-mini': yield* OpenAiLanguageModel.model('o3-mini'),
    } satisfies Partial<Record<ModelName, Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>>>;
  }),
);

export const DEFAULT_LMSTUDIO_ENDPOINT = 'http://localhost:1234/v1';

export const LMStudioResolver = AiModelResolver.fromModelMap(
  Effect.gen(function* () {
    return {
      '@google/gemma-3-27b': yield* OpenAiLanguageModel.model('google/gemma-3-27b'),
      '@meta/llama-3.2-3b-instruct': yield* OpenAiLanguageModel.model('llama-3.2-3b-instruct'),
    } satisfies Partial<Record<ModelName, Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>>>;
  }).pipe(
    Effect.provide(
      OpenAiClient.layer({
        apiUrl: DEFAULT_LMSTUDIO_ENDPOINT,
      }),
    ),
  ),
);

export const DEFAULT_OLLAMA_ENDPOINT = 'http://localhost:11434';

export const OllamaResolver = ({
  host = DEFAULT_OLLAMA_ENDPOINT,
  transformClient,
}: {
  readonly host?: string;
  readonly transformClient?: (client: HttpClient.HttpClient) => HttpClient.HttpClient;
} = {}) =>
  AiModelResolver.fromModelMap(
    Effect.gen(function* () {
      return {
        '@google/gemma-3-27b': yield* OpenAiLanguageModel.model('gemma-3-27b'),
        'deepseek-r1:latest': yield* OpenAiLanguageModel.model('deepseek-r1:latest'),
        'qwen2.5:14b': yield* OpenAiLanguageModel.model('qwen2.5:14b'),
      } satisfies Partial<Record<ModelName, Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>>>;
    }).pipe(
      Effect.provide(
        OpenAiClient.layer({
          apiUrl: host + '/v1',
          transformClient,
        }),
      ),
    ),
  );

/**
 * @deprecated This is a preset and we should not use it directly.
 */
export const AiServiceRouter = AiModelResolver.buildAiService.pipe(
  Layer.provide(AnthropicResolver),
  Layer.provide(LMStudioResolver),
  // Layer.provide(OpenAiResolver),
);
