//
// Copyright 2026 DXOS.org
//

/** A sync episode that just ended, ready to be recorded. */
export type ClosedEpisode = {
  durationMs: number;
  /**
   * True when the episode was already in flight at the first observation, so its start is a lower
   * bound. Reported anyway — it under-states duration, which the stall gauge covers.
   */
  truncated: boolean;
};

/**
 * Folds observations of the outstanding sync backlog into episode durations and stall age.
 *
 * Pure over `(now, pendingWorkCount)` so both instruments are testable without a client or a clock.
 */
export class SyncEpisodeTracker {
  #openedAt: number | undefined;
  #lastProgressAt = 0;
  #lowWaterMark = 0;
  #truncated = false;
  #sawCaughtUp = false;

  get isOpen(): boolean {
    return this.#openedAt !== undefined;
  }

  /**
   * Feeds one observation, returning the episode this observation closed, if any.
   * Progress is a decrease in the backlog's low-water mark rather than any emission, so a client
   * re-reporting the same backlog does not look healthy and concurrent local writes raising the
   * count do not reset the stall clock.
   */
  observe(now: number, pendingWorkCount: number): ClosedEpisode | undefined {
    if (pendingWorkCount <= 0) {
      this.#sawCaughtUp = true;
      if (this.#openedAt === undefined) {
        return undefined;
      }

      const closed: ClosedEpisode = { durationMs: now - this.#openedAt, truncated: this.#truncated };
      this.#openedAt = undefined;
      this.#truncated = false;
      return closed;
    }

    if (this.#openedAt === undefined) {
      this.#openedAt = now;
      this.#lastProgressAt = now;
      this.#lowWaterMark = pendingWorkCount;
      // Nothing observed the 0 -> non-zero transition, so the backlog may predate this process.
      this.#truncated = !this.#sawCaughtUp;
      return undefined;
    }

    if (pendingWorkCount < this.#lowWaterMark) {
      this.#lowWaterMark = pendingWorkCount;
      this.#lastProgressAt = now;
    }

    return undefined;
  }

  /**
   * Age of the last observed progress while an episode is open; `0` when caught up.
   * This is the stuck-detector: an episode that never closes never records a duration, so a
   * permanently stuck client is invisible in the duration histogram by construction.
   */
  stalledForMs(now: number): number {
    return this.#openedAt === undefined ? 0 : Math.max(0, now - this.#lastProgressAt);
  }
}
