//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import type * as LanguageModel from 'effect/unstable/ai/LanguageModel';
import * as Telemetry from 'effect/unstable/ai/Telemetry';

import { DXN } from '@dxos/keys';

import * as AiService from './AiService';
import * as AiTelemetry from './AiTelemetry';
import { AiModelNotAvailableError } from './errors';

const telemetryLayer = Layer.succeed(Telemetry.CurrentSpanTransformer, AiTelemetry.makeSpanTransformer());

/**
 * v4 removed `Layer.fail`; a failing layer is the failure effect lifted with `Layer.unwrap`.
 */
const failedLayer = (
  error: AiModelNotAvailableError,
): Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError> => Layer.unwrap(Effect.fail(error));

export class AiModelResolver extends Context.Service<AiModelResolver, AiService.Service>()(
  '@dxos/ai/AiModelResolver',
) {}

export const buildAiService: Layer.Layer<AiService.AiService, never, AiModelResolver> = Layer.effect(
  AiService.AiService,
  Effect.gen(function* () {
    const resolver = yield* AiModelResolver;
    return {
      metadata: resolver.metadata,
      model: (name, options) => Layer.merge(resolver.model(name, options), telemetryLayer),
    } satisfies Context.Service.Shape<typeof AiService.AiService>;
  }),
);

export const resolver = <R>(
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
            Layer.catchCause(() =>
              Option.isSome(upstream)
                ? upstream.value.model(modelName, options)
                : failedLayer(new AiModelNotAvailableError(modelName)),
            ),
          ),
      };
    }),
  );

export const fromModelMap = <R>(
  metadata: AiService.ServiceMetadata,
  provider: DXN.DXN,
  models: Effect.Effect<
    Partial<Record<DXN.DXN, Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>>>,
    never,
    R
  >,
): Layer.Layer<AiModelResolver, never, R> =>
  resolver(
    metadata,
    models.pipe(
      Effect.map(
        (models) => (modelName: DXN.DXN, options?: AiService.ResolveOptions) =>
          options?.provider === provider
            ? (models[modelName] ?? failedLayer(new AiModelNotAvailableError(modelName)))
            : failedLayer(new AiModelNotAvailableError(modelName)),
      ),
    ),
  );
