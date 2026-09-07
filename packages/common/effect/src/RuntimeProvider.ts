//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Tracer from 'effect/Tracer';

import { runAndForwardErrors, unwrapExit } from './internal/errors';
import { makeGlobalTracer } from './otel';

let defaultTracer: Context.Context<never> | undefined;

const withDefaultTracer = <R>(context: Context.Context<R>): Context.Context<R> => {
  defaultTracer ??= Context.make(Tracer.Tracer, makeGlobalTracer('@dxos/effect/RuntimeProvider'));
  return Context.merge(defaultTracer, context);
};

/**
 * Provides effect runtime with services to run effects.
 *
 * Effect 4 removed the `Runtime<R>` value this used to carry -- its `Runtime` module is now only
 * about `runMain` -- so the provider yields the service context directly. That is what every
 * consumer actually used the runtime for, and it drops a layer of indirection.
 */
export type RuntimeProvider<R> = Effect.Effect<Context.Context<R>>;

/**
 * Bridges a runtime provider into a {@link Layer} exposing its services, so a stack that resolves
 * dependencies via `RuntimeProvider.currentRuntime` can be provided from an existing runtime.
 */
export const toLayer = <R>(provider: RuntimeProvider<R>): Layer.Layer<R> => Layer.effectContext(provider);

/**
 * @returns Runtime provider from the current context.
 */
export const currentRuntime = <R = never>(): Effect.Effect<RuntimeProvider<R>, never, R> =>
  Effect.context<R>().pipe(Effect.map(Effect.succeed));

/**
 * Run effect, within runtime, clean errors and fix stack-traces.
 */
export const runPromise =
  <R>(provider: RuntimeProvider<R>) =>
  async <A>(effect: Effect.Effect<A, any, R>): Promise<A> => {
    const context = await runAndForwardErrors(provider);
    return unwrapExit(await Effect.runPromiseExit(Effect.provideContext(effect, withDefaultTracer(context))));
  };

/**
 * Provide services from runtime provider to effect.
 */
export const provide: {
  <R2>(runtime: RuntimeProvider<R2>): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, R2>>;
} = (runtimeProvider) => (effect) =>
  Effect.flatMap(runtimeProvider, (context) => Effect.provideContext(effect, withDefaultTracer(context)));
