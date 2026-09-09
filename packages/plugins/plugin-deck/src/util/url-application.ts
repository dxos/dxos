//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

/** One URL's claim on the deck, handed out by {@link UrlApplication.begin}. */
export type Application = {
  /** Whether a foreign write, or a newer URL, has taken the deck since this claim was made. */
  readonly superseded: () => boolean;
};

/** Provenance for deck-state changes, which the atom itself does not carry. */
export type UrlApplication<S> = {
  /** Attribute the deck-state writes `effect` performs to applying a URL. */
  readonly applying: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
  /** Start applying a URL, superseding whichever URL was being applied before. */
  readonly begin: () => Application;
  /** Record a deck-state change, reporting whether the URL should follow it. */
  readonly observe: (state: S) => boolean;
};

/**
 * `initial` is the atom's current value, so a storage-backed atom's hydration is not read as a
 * change: `Atom.kvs` sets the stored value into the node while evaluating, which notifies every
 * listener attached at that point although nothing changed. Reading it here also mounts the atom, so
 * that notification is normally spent before anything subscribes; seeding makes the fix hold even if
 * it is not.
 */
export const makeUrlApplication = <S>(initial: S): UrlApplication<S> => {
  let last = initial;
  let applying = 0;
  let pending: { superseded: boolean } | undefined;

  const supersede = () => {
    if (pending) {
      pending.superseded = true;
      pending = undefined;
    }
  };

  return {
    applying: (effect) =>
      Effect.suspend(() => {
        applying += 1;
        return Effect.ensuring(
          effect,
          Effect.sync(() => {
            applying -= 1;
          }),
        );
      }),
    begin: () => {
      supersede();
      const claim = { superseded: false };
      pending = claim;
      return { superseded: () => claim.superseded };
    },
    observe: (state) => {
      if (state === last) {
        return false;
      }
      last = state;
      if (applying > 0) {
        return false;
      }
      supersede();
      return true;
    },
  };
};
