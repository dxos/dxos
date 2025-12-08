//
// Copyright 2025 DXOS.org
//

import type * as LanguageModel from '@effect/ai/LanguageModel';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { AiService, type SericeMetadata, type Service } from './AiService';
import { type ModelName as ModelName } from './defs';
import { AiModelNotAvailableError } from './errors';

export class AiModelResolver extends Context.Tag('@dxos/ai/AiModelResolver')<AiModelResolver, Service>() {
  static buildAiService: Layer.Layer<AiService, never, AiModelResolver> = Layer.effect(
    AiService,
    Effect.gen(function* () {
      const resolver = yield* AiModelResolver;
      return {
        metadata: resolver.metadata,
        model: (name) => resolver.model(name),
      } satisfies Context.Tag.Service<AiService>;
    }),
  );

  static resolver = <R>(
    metadata: SericeMetadata,
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
          metadata,
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
    metadata: SericeMetadata,
    models: Effect.Effect<
      Partial<Record<ModelName, Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>>>,
      never,
      R
    >,
  ): Layer.Layer<AiModelResolver, never, R> =>
    AiModelResolver.resolver(
      metadata,
      models.pipe(
        Effect.map(
          (models) => (modelName: ModelName) =>
            models[modelName] ?? Layer.fail(new AiModelNotAvailableError(modelName)),
        ),
      ),
    );
}
