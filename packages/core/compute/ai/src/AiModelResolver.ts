//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Telemetry from 'effect/unstable/ai/Telemetry';

import { DXN } from '@dxos/keys';

import * as AiService from './AiService.ts';
import * as AiTelemetry from './AiTelemetry.ts';
import { AiModelNotAvailableError } from './errors.ts';

const telemetryLayer = Layer.succeed(Telemetry.CurrentSpanTransformer, AiTelemetry.makeSpanTransformer());

/**
 * v4 removed `Layer.fail`; a failing layer is the failure effect lifted with `Layer.unwrap`.
 */
const failedLayer = <A>(error: AiModelNotAvailableError): Layer.Layer<A, AiModelNotAvailableError> =>
  Layer.unwrap(Effect.fail(error));

export class AiModelResolver extends Context.Service<AiModelResolver, AiService.Service>()(
  '@dxos/ai/AiModelResolver',
) {}

export const buildAiService: Layer.Layer<AiService.AiService, never, AiModelResolver> = Layer.effect(
  AiService.AiService,
  Effect.gen(function* () {
    const resolver = yield* AiModelResolver;
    return {
      metadata: resolver.metadata,
      languageModel: (name, options) => Layer.merge(resolver.languageModel(name, options), telemetryLayer),
      decisionModel: resolver.decisionModel,
    } satisfies Context.Service.Shape<typeof AiService.AiService>;
  }),
);

/**
 * Chains a resolver onto the one below it: each kind of model this resolver serves falls back to the
 * upstream resolver when it fails, and each kind it does not serve goes straight upstream.
 */
const chain = <R>(
  metadata: AiService.ServiceMetadata,
  impl: Effect.Effect<Partial<Pick<AiService.Service, 'languageModel' | 'decisionModel'>>, never, R>,
): Layer.Layer<AiModelResolver, never, R> =>
  Layer.effect(
    AiModelResolver,
    Effect.gen(function* () {
      const own = yield* impl;
      const upstream = yield* Effect.serviceOption(AiModelResolver);
      const fallback = <A>(
        resolve: ((service: AiService.Service) => Layer.Layer<A, AiModelNotAvailableError>) | undefined,
        modelName: DXN.DXN,
      ): Layer.Layer<A, AiModelNotAvailableError> =>
        Option.isSome(upstream) && resolve
          ? resolve(upstream.value)
          : failedLayer(new AiModelNotAvailableError(modelName));

      return {
        metadata,
        languageModel: (modelName, options) => {
          const next = (service: AiService.Service) => service.languageModel(modelName, options);
          return own.languageModel
            ? own.languageModel(modelName, options).pipe(Layer.catchCause(() => fallback(next, modelName)))
            : fallback(next, modelName);
        },
        decisionModel: (modelName, options) => {
          const next = (service: AiService.Service) => service.decisionModel(modelName, options);
          return own.decisionModel
            ? own.decisionModel(modelName, options).pipe(Layer.catchCause(() => fallback(next, modelName)))
            : fallback(next, modelName);
        },
      };
    }),
  );

/** A resolver serving language models; decision models go upstream. */
export const resolver = <R>(
  metadata: AiService.ServiceMetadata,
  impl: Effect.Effect<AiService.LanguageModelResolver, never, R>,
): Layer.Layer<AiModelResolver, never, R> =>
  chain(
    metadata,
    Effect.map(impl, (languageModel) => ({ languageModel })),
  );

/** A resolver serving decision models; language models go upstream. */
export const decisionResolver = <R>(
  metadata: AiService.ServiceMetadata,
  impl: Effect.Effect<AiService.DecisionModelResolver, never, R>,
): Layer.Layer<AiModelResolver, never, R> =>
  chain(
    metadata,
    Effect.map(impl, (decisionModel) => ({ decisionModel })),
  );

export const fromModelMap = <R>(
  metadata: AiService.ServiceMetadata,
  provider: DXN.DXN,
  models: Effect.Effect<Partial<Record<DXN.DXN, ReturnType<AiService.LanguageModelResolver>>>, never, R>,
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
