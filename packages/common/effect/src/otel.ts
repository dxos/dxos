//
// Copyright 2025 DXOS.org
//

import * as Tracer from '@effect/opentelemetry/OtelTracer';
import * as Resource from '@effect/opentelemetry/Resource';
import { type Attributes, type TracerProvider, trace } from '@opentelemetry/api';
import * as Effect from 'effect/Effect';
import type * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import type * as EffectTracer from 'effect/Tracer';

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
  (evaluate: Function.LazyArg<Configuration>): Layer.Layer<Resource.Resource>;
  <R, E>(evaluate: Effect.Effect<Configuration, E, R>): Layer.Layer<Resource.Resource, E, R>;
} = (
  evaluate: Function.LazyArg<Configuration> | Effect.Effect<Configuration, any, any>,
): Layer.Layer<Resource.Resource> =>
  Layer.unwrap(
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

/**
 * Effect `Tracer` backed by an explicit OTel provider, for injection via
 * `Effect.provideService(Tracer.Tracer, ...)` — unlike {@link layerOtel}, which reads the global
 * provider, this lets a caller scope tracing to its own provider (and processors).
 */
export const makeTracer = (provider: TracerProvider, name = '@dxos/effect'): EffectTracer.Tracer =>
  Effect.runSync(Tracer.make.pipe(Effect.provideService(Tracer.OtelTracer, provider.getTracer(name))));

/**
 * Effect tracer over the OTel API's global provider.
 *
 * The global is a `ProxyTracerProvider`, and the tracer it hands out late-binds: spans no-op until
 * a real provider is registered, and every tracer already handed out starts delegating to it from
 * then on. So a caller can install this before observability has initialized — which is what lets
 * the process manager's tracer be contributed at startup rather than waiting on it.
 */
export const makeGlobalTracer = (name?: string): EffectTracer.Tracer => makeTracer(trace.getTracerProvider(), name);
