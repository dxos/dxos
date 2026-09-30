//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

const canTransition = (): boolean =>
  typeof document !== 'undefined' &&
  'startViewTransition' in document &&
  document.visibilityState === 'visible' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Handles = {
  captured: Promise<void>;
  settle: () => void;
};

// Promises, not Effects: the update callback has to hand the browser one.
const startTransition = (types: string[]) =>
  Effect.try(() => {
    let signalCaptured = () => {};
    let settle = () => {};
    const captured = new Promise<void>((resolve) => {
      signalCaptured = resolve;
    });
    const settled = new Promise<void>((resolve) => {
      settle = resolve;
    });
    document.startViewTransition({
      update: () => {
        signalCaptured();
        return settled;
      },
      types,
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
export const withViewTransition = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  types: string[] = [],
): Effect.Effect<A, E, R> =>
  Effect.suspend(() => {
    if (!canTransition()) {
      return effect;
    }

    return Effect.option(startTransition(types)).pipe(
      Effect.flatMap(
        Option.match({
          onNone: () => effect,
          onSome: ({ captured, settle }) =>
            Effect.promise(() => captured).pipe(Effect.andThen(effect), Effect.ensuring(Effect.sync(settle))),
        }),
      ),
    );
  });
