//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

/**
 * Loops over whole-store reads that hand the event loop back between slices: `serve` answers HTTP
 * on the thread that runs the watcher's passes, and one uninterrupted loop over a few hundred
 * thousand quads holds every request for a second or more.
 */

/** Items per slice; each costs a few milliseconds in the loops here. */
const SLICE = 4_096;

/** Runs `step` over every item, yielding to the event loop after each slice. */
export const forEach = <A>(items: Iterable<A>, step: (item: A) => void): Effect.Effect<void> =>
  Effect.gen(function* () {
    let count = 0;
    for (const item of items) {
      step(item);
      if (++count % SLICE === 0) {
        yield* Effect.yieldNow;
      }
    }
  });

/** `items.map(transform)`, yielding between slices. */
export const map = <A, B>(items: Iterable<A>, transform: (item: A) => B): Effect.Effect<B[]> =>
  Effect.suspend(() => {
    const mapped: B[] = [];
    return Effect.as(
      forEach(items, (item) => {
        mapped.push(transform(item));
      }),
      mapped,
    );
  });

/** `items.filter(keep)`, yielding between slices. */
export const filter = <A>(items: Iterable<A>, keep: (item: A) => boolean): Effect.Effect<A[]> =>
  Effect.suspend(() => {
    const kept: A[] = [];
    return Effect.as(
      forEach(items, (item) => {
        if (keep(item)) {
          kept.push(item);
        }
      }),
      kept,
    );
  });
