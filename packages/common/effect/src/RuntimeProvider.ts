//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';
import * as Runtime from 'effect/Runtime';

import { runAndForwardErrors, unwrapExit } from './errors';

export type RuntimeProvider<R> = Effect.Effect<Runtime.Runtime<R>>;

export const runPromise =
  <A, R>(provider: RuntimeProvider<R>) =>
  async (effect: Effect.Effect<A, any, R>): Promise<A> => {
    const runtime = await runAndForwardErrors(provider);
    return unwrapExit(await effect.pipe(Runtime.runPromiseExit(runtime)));
  };
