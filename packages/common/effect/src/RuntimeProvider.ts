//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Runtime from 'effect/Runtime';

import { runAndForwardErrors, unwrapExit } from './errors';

/**
 * Provides effect runtime with services to run effects.
 */
export type RuntimeProvider<R> = Effect.Effect<Runtime.Runtime<R>>;

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
