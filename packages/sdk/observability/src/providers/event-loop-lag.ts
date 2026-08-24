//
// Copyright 2026 DXOS.org
//

/** How often the loop is probed. Short enough to catch a stall inside one export window. */
export const LAG_SAMPLE_INTERVAL_MS = 500;

/**
 * Tracks how far behind schedule a timer fires, which is how long the realm's event loop was busy.
 *
 * Reports the maximum since the last read rather than an instantaneous value: a gauge sampled only
 * at collection time can never observe a stall, because a blocked loop delays the collection
 * callback itself.
 */
export class EventLoopLagTracker {
  #maxLagMs = 0;
  #lastSampleAt: number | undefined;

  constructor(private readonly _intervalMs: number = LAG_SAMPLE_INTERVAL_MS) {}

  /** Records one probe. Lag is elapsed time beyond the scheduled interval. */
  sample(now: number): void {
    if (this.#lastSampleAt !== undefined) {
      this.#maxLagMs = Math.max(this.#maxLagMs, Math.max(0, now - this.#lastSampleAt - this._intervalMs));
    }
    this.#lastSampleAt = now;
  }

  /** Returns the peak lag since the previous call and resets it, so each export window is independent. */
  takeMaxMs(): number {
    const max = this.#maxLagMs;
    this.#maxLagMs = 0;
    return max;
  }
}
