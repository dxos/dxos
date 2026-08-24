//
// Copyright 2026 DXOS.org
//

/** How often the loop is probed. Short enough to catch a stall inside one export window. */
export const LAG_SAMPLE_INTERVAL_MS = 500;

/** Window the reported peak covers. Matches the metric export interval. */
export const LAG_WINDOW_MS = 60_000;

/**
 * Tracks how far behind schedule a timer fires, which is how long the realm's event loop was busy.
 *
 * Reports the peak of the last completed window rather than an instantaneous value: a gauge read
 * only at collection time can never observe a stall, because a blocked loop delays the collection
 * callback itself.
 *
 * The window is rotated by {@link rotate} rather than by the read, so {@link peakMs} is a plain
 * idempotent getter. A read that consumed the value would break as soon as it ran more than once
 * per window — which `RemoteMetrics` fan-out to a second processor, or a `flush()` landing next to
 * a periodic collection, would both cause.
 */
export class EventLoopLagTracker {
  #maxInWindowMs = 0;
  #peakMs = 0;
  #lastSampleAt: number | undefined;

  constructor(private readonly _intervalMs: number = LAG_SAMPLE_INTERVAL_MS) {}

  /** Records one probe. Lag is elapsed time beyond the scheduled interval. */
  sample(now: number): void {
    if (this.#lastSampleAt !== undefined) {
      this.#maxInWindowMs = Math.max(this.#maxInWindowMs, Math.max(0, now - this.#lastSampleAt - this._intervalMs));
    }
    this.#lastSampleAt = now;
  }

  /** Peak lag observed during the last completed window. Safe to read any number of times. */
  get peakMs(): number {
    return this.#peakMs;
  }

  /** Closes the current window, publishing its peak. Driven on the export cadence. */
  rotate(): void {
    this.#peakMs = this.#maxInWindowMs;
    this.#maxInWindowMs = 0;
  }
}
