//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as LanguageModel from '@effect/ai/LanguageModel';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { DXN } from '@dxos/keys';

import * as AiService from './AiService';
import { AiModelNotAvailableError } from './errors';

export class AiModelResolver extends Context.Tag('@dxos/ai/AiModelResolver')<AiModelResolver, AiService.Service>() {
  static buildAiService: Layer.Layer<AiService.AiService, never, AiModelResolver> = Layer.effect(
    AiService.AiService,
    Effect.gen(function* () {
      const resolver = yield* AiModelResolver;
      return {
        metadata: resolver.metadata,
        model: (name, options) => resolver.model(name, options),
      } satisfies Context.Tag.Service<AiService.AiService>;
    }),
  );

  static resolver = <R>(
    metadata: AiService.ServiceMetadata,
    impl: Effect.Effect<
      (
        model: DXN.DXN,
        options?: AiService.ResolveOptions,
      ) => Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>,
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
          model: (modelName, options) =>
            getModel(modelName, options).pipe(
              Layer.catchAll(() => {
                if (Option.isSome(upstream)) {
                  return upstream.value.model(modelName, options);
                } else {
                  return Layer.fail(new AiModelNotAvailableError(modelName));
                }
              }),
            ),
        };
      }),
    );

  static fromModelMap = <R>(
    metadata: AiService.ServiceMetadata,
    provider: DXN.DXN,
    models: Effect.Effect<
      Partial<Record<DXN.DXN, Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>>>,
      never,
      R
    >,
  ): Layer.Layer<AiModelResolver, never, R> =>
    AiModelResolver.resolver(
      metadata,
      models.pipe(
        Effect.map(
          (models) => (modelName: DXN.DXN, options?: AiService.ResolveOptions) =>
            options?.provider === provider
              ? (models[modelName] ?? Layer.fail(new AiModelNotAvailableError(modelName)))
              : Layer.fail(new AiModelNotAvailableError(modelName)),
        ),
      ),
    );
}
