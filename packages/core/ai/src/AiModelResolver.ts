//
// Copyright 2025 DXOS.org
//

import type * as LanguageModel from '@effect/ai/LanguageModel';
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
    readonly name: string;
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
    name: string,
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
          name,
          model: (modelName) =>
            getModel(modelName).pipe(
              Layer.catchAll(() => {
                if (Option.isSome(upstream)) {
                  return upstream.value.model(modelName);
                } else {
                  return Layer.fail(new AiModelNotAvailableError(modelName));
                }
              }),
            ),
        };
      }),
    );

  static fromModelMap = <R>(
    name: string,
    models: Effect.Effect<
      Partial<Record<ModelName, Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>>>,
      never,
      R
    >,
  ): Layer.Layer<AiModelResolver, never, R> =>
    AiModelResolver.resolver(
      name,
      models.pipe(
        Effect.map(
          (models) => (modelName: ModelName) =>
            models[modelName] ?? Layer.fail(new AiModelNotAvailableError(modelName)),
        ),
      ),
    );
}
