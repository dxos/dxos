//
// Copyright 2025 DXOS.org
//

import { Resource, Tracer } from '@effect/opentelemetry';
import { type Attributes, trace } from '@opentelemetry/api';
import * as Effect from 'effect/Effect';
import { type LazyArg } from 'effect/Function';
import * as Layer from 'effect/Layer';

export interface Configuration {
  readonly resource?:
    | {
        readonly serviceName: string;
        readonly serviceVersion?: string;
        readonly attributes?: Attributes;
      }
    | undefined;
}

// Based on https://github.com/Effect-TS/effect/blob/main/packages/opentelemetry/src/NodeSdk.ts
export const layerOtel: {
  (evaluate: LazyArg<Configuration>): Layer.Layer<Resource.Resource>;
  <R, E>(evaluate: Effect.Effect<Configuration, E, R>): Layer.Layer<Resource.Resource, E, R>;
} = (evaluate: LazyArg<Configuration> | Effect.Effect<Configuration, any, any>): Layer.Layer<Resource.Resource> =>
  Layer.unwrapEffect(
    Effect.map(
      Effect.isEffect(evaluate) ? (evaluate as Effect.Effect<Configuration>) : Effect.sync(evaluate),
      (config) => {
        const ResourceLive = Resource.layerFromEnv(config.resource && Resource.configToAttributes(config.resource));

        const provider = trace.getTracerProvider();
        const TracerLive = Layer.provide(Tracer.layer, Layer.succeed(Tracer.OtelTracerProvider, provider));

        // TODO(wittjosiah): Add metrics and logger layers.
        const MetricsLive = Layer.empty;
        const LoggerLive = Layer.empty;

        return Layer.mergeAll(TracerLive, MetricsLive, LoggerLive).pipe(Layer.provideMerge(ResourceLive));
      },
    ),
  );
