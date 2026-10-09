//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

/**
 * A single-holder lock that passes itself to the longest waiter on release. Effect's `Semaphore` frees
 * its permit and wakes waiters on a later task, so a holder that releases and takes again gets the
 * permit back ahead of everyone waiting.
 */
export class FairLock {
  #held = false;
  readonly #waiting: (() => void)[] = [];

  /** Waits uninterruptibly, because a waiter can be handed the lock at any moment and must pass it on. */
  readonly take: Effect.Effect<void> = Effect.uninterruptible(
    Effect.callback<void>((resume) => {
      if (this.#held) {
        this.#waiting.push(() => resume(Effect.void));
      } else {
        this.#held = true;
        resume(Effect.void);
      }
    }),
  );

  readonly release: Effect.Effect<void> = Effect.sync(() => {
    const next = this.#waiting.shift();
    if (next) {
      // A microtask, so a run of handoffs does not nest each waiter inside the one before.
      queueMicrotask(next);
    } else {
      this.#held = false;
    }
  });

  withLock<A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> {
    return Effect.uninterruptibleMask((restore) =>
      Effect.andThen(this.take, Effect.ensuring(restore(effect), this.release)),
    );
  }
}
