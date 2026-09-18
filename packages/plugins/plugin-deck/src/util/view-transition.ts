//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

/**
 * Whether the document can animate a same-document view transition right now. A hidden tab is
 * excluded because the browser skips its transitions anyway, and reduced motion because the whole
 * point of the animation is motion.
 */
const canTransition = (): boolean =>
  typeof document !== 'undefined' &&
  'startViewTransition' in document &&
  document.visibilityState === 'visible' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The two ends of a started transition's update callback. */
type Handles = {
  /** Resolves once the browser has captured the old state and invoked the update callback. */
  captured: Promise<void>;
  /** Settles the update callback, releasing the browser to capture the new state. */
  settle: () => void;
};

/**
 * Start a transition whose update callback only reports that it was invoked, then waits to be settled.
 * Promises rather than Effects because the callback has to hand the browser one. Fails when the
 * document refuses to start a transition (detached, mid-navigation).
 */
const startTransition = Effect.try(() => {
  let signalCaptured = () => {};
  let settle = () => {};
  const captured = new Promise<void>((resolve) => {
    signalCaptured = resolve;
  });
  const settled = new Promise<void>((resolve) => {
    settle = resolve;
  });
  document.startViewTransition(() => {
    signalCaptured();
    return settled;
  });
  return { captured, settle } satisfies Handles;
});

/**
 * Run `effect` as the update step of a view transition, so the browser animates the DOM from the
 * state before it to the state after it. Where the document cannot animate one, the effect just runs.
 *
 * The effect starts only once the browser has captured the old state, and the update callback settles
 * only once the effect has, so the writes it makes have flushed to the DOM before the new state is
 * captured. Keep the wrapped effect short: rendering is frozen until the callback settles, and the
 * browser abandons the transition after a few seconds.
 */
export const withViewTransition = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  Effect.suspend(() => {
    if (!canTransition()) {
      return effect;
    }

    return Effect.option(startTransition).pipe(
      Effect.flatMap(
        Option.match({
          // A document that refuses to start one is no failure of the caller's.
          onNone: () => effect,
          onSome: ({ captured, settle }) =>
            Effect.promise(() => captured).pipe(
              Effect.andThen(effect),
              // Settled on every exit, interruption included, or rendering stays frozen until the browser gives up on the callback.
              Effect.ensuring(Effect.sync(settle)),
            ),
        }),
      ),
    );
  });
