//
// Copyright 2025 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';
import * as Tracer from 'effect/Tracer';

import { Context } from '@dxos/context';

// TODO(dmaretskyi): Error handling.
export const contextFromScope = (): Effect.Effect<Context, never, Scope.Scope> =>
  Effect.gen(function* () {
    const ctx = new Context();
    yield* Effect.addFinalizer(() => Effect.promise(() => ctx.dispose()));
    return ctx;
  });

/**
 * The current context minus the parent span: what work dispatched later (an alarm, a child event, a
 * forked refresh) should start from, so it does not nest under whatever happened to be running.
 */
export const contextWithoutParentSpan = <R = never>(): Effect.Effect<
  EffectContext.Context<Exclude<R, Tracer.ParentSpan>>,
  never,
  R
> => Effect.map(Effect.context<R>(), EffectContext.omit(Tracer.ParentSpan));
