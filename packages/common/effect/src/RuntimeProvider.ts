//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Runtime from 'effect/Runtime';

import { runAndForwardErrors, unwrapExit } from './internal/errors';

/**
 * Provides effect runtime with services to run effects.
 */
export type RuntimeProvider<R> = Effect.Effect<Runtime.Runtime<R>>;

/**
 * Bridges a runtime provider into a {@link Layer} exposing its services, so a stack that resolves
 * dependencies via `RuntimeProvider.currentRuntime` can be provided from an existing runtime.
 */
export const toLayer = <R>(provider: RuntimeProvider<R>): Layer.Layer<R> =>
  Layer.effectContext(Effect.map(provider, (runtime) => runtime.context));

/**
 * @returns Runtime provider from the current context.
 */
export const currentRuntime = <R = never>() => Effect.runtime<R>().pipe(Effect.map(Effect.succeed));

/**
 * Run effect, within runitme, clean errors and fix stack-traces.
 */
export const runPromise =
  <R>(provider: RuntimeProvider<R>) =>
  async <A>(effect: Effect.Effect<A, any, R>): Promise<A> => {
    const runtime = await runAndForwardErrors(provider);
    return unwrapExit(await effect.pipe(Runtime.runPromiseExit(runtime)));
  };

/**
 * Provide services from runtime provider to effect.
 */
export const provide: {
  <R2>(runtime: RuntimeProvider<R2>): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, R2>>;
} = (runtimeProvider) => (effect) => Effect.flatMap(runtimeProvider, (runtime) => Effect.provide(effect, runtime));
