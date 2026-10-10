//
// Copyright 2026 DXOS.org
//

export type OnsetDetectorOptions = {
  /** Past flux values used for the adaptive (median) threshold. */
  historySize?: number;
  /** Threshold = median × multiplier + delta. */
  multiplier?: number;
  delta?: number;
  /** Minimum number of frames between onsets. */
  refractoryFrames?: number;
  /** Log compression gain applied to magnitudes before differencing. */
  compression?: number;
};

export type OnsetResult = {
  flux: number;
  threshold: number;
  onset: boolean;
};

/**
 * Spectral-flux onset detector: half-wave rectified frame-to-frame increase of the
 * log-compressed magnitude spectrum, compared against an adaptive median threshold.
 */
export class OnsetDetector {
  readonly #historySize: number;
  readonly #multiplier: number;
  readonly #delta: number;
  readonly #refractoryFrames: number;
  readonly #compression: number;
  readonly #history: number[] = [];
  #previous: Float32Array | undefined;
  #framesSinceOnset = Number.POSITIVE_INFINITY;

  constructor({
    historySize = 16,
    multiplier = 2,
    delta = 0.05,
    refractoryFrames = 6,
    compression = 100,
  }: OnsetDetectorOptions = {}) {
    this.#historySize = historySize;
    this.#multiplier = multiplier;
    this.#delta = delta;
    this.#refractoryFrames = refractoryFrames;
    this.#compression = compression;
  }

  /** Processes one magnitude spectrum; `gate` suppresses onsets (e.g. during silence). */
  process(magnitudes: Float32Array, gate = true): OnsetResult {
    const current = new Float32Array(magnitudes.length);
    for (let bin = 0; bin < magnitudes.length; bin++) {
      current[bin] = Math.log1p(this.#compression * magnitudes[bin]);
    }

    let flux = 0;
    if (this.#previous) {
      for (let bin = 0; bin < current.length; bin++) {
        const increase = current[bin] - this.#previous[bin];
        if (increase > 0) {
          flux += increase;
        }
      }
      flux /= current.length;
    }
    this.#previous = current;

    const threshold = median(this.#history) * this.#multiplier + this.#delta;
    this.#history.push(flux);
    if (this.#history.length > this.#historySize) {
      this.#history.shift();
    }

    this.#framesSinceOnset++;
    const onset = gate && flux > threshold && this.#framesSinceOnset > this.#refractoryFrames;
    if (onset) {
      this.#framesSinceOnset = 0;
    }

    return { flux, threshold, onset };
  }
}

const median = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
