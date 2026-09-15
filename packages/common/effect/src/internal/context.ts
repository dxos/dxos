//
// Copyright 2025 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';
import * as Tracer from 'effect/Tracer';

import { Context, ContextRpcCodec } from '@dxos/context';

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

/**
 * W3C `traceparent` -- `{version}-{traceId}-{spanId}-{flags}`, as stored on the DXOS context.
 */
const TRACEPARENT_RE = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

const parentSpanFromContext = (ctx: Context): Tracer.ExternalSpan | undefined => {
  const traceContext = ContextRpcCodec.encode(ctx);
  const match = traceContext && TRACEPARENT_RE.exec(traceContext.traceparent);
  if (!match) {
    return undefined;
  }
  const [, , traceId, spanId, flags] = match;
  return Tracer.externalSpan({
    traceId,
    spanId,
    sampled: (Number.parseInt(flags, 16) & 1) === 1,
  });
};

/**
 * Interrupts when `ctx` is disposed. The subscription is removed on completion so a long-lived
 * context driving many short effects does not accumulate a dispose callback per run.
 */
const interruptOnDispose = (ctx: Context): Effect.Effect<never> =>
  Effect.callback<void>((resume) => {
    if (ctx.disposed) {
      resume(Effect.void);
      return;
    }
    const unsubscribe = ctx.onDispose(() => resume(Effect.void));
    return Effect.sync(unsubscribe);
  }).pipe(Effect.andThen(Effect.interrupt));

/**
 * Runs an effect under a DXOS {@link Context}: the context's trace identity becomes the effect's
 * parent span, and disposing the context interrupts the fiber.
 *
 * The two halves of a `ctx` that the Effect world otherwise drops on the floor. Without the first,
 * an effect launched from a `@trace.span()` method starts its own root trace instead of nesting
 * under the caller -- which is why work dispatched through `RuntimeProvider.runPromise` shows up in
 * SigNoz as thousands of parentless traces. Without the second, the fiber outlives the resource
 * that scheduled it.
 *
 * Apply it before `RuntimeProvider.runPromise`/`provide`: those fill the *remaining* requirements,
 * so the parent span set here is what the effect's own `Effect.withSpan` calls see.
 */
export const withContext =
  (ctx: Context) =>
  <A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> => {
    const parentSpan = parentSpanFromContext(ctx);
    // `raceFirst`, not `interruptWhen` (gone in Effect 4): the loser is interrupted either way, so
    // a completed effect drops its dispose subscription rather than holding it for the ctx's life.
    const interruptible: Effect.Effect<A, E, R> = Effect.raceFirst(self, interruptOnDispose(ctx));
    return parentSpan ? Effect.provideService(interruptible, Tracer.ParentSpan, parentSpan) : interruptible;
  };
