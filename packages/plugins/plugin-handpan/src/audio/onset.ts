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
  /**
   * Per-frame decay of the running spectral peak that magnitudes are normalized by, so detection
   * does not depend on input level (a distant microphone is 20–40 dB quieter than a close one).
   */
  peakDecay?: number;
  /** Lowest peak normalized against; keeps background noise from being amplified to full scale. */
  minPeak?: number;
};

export type OnsetResult = {
  flux: number;
  threshold: number;
  onset: boolean;
};

/**
 * Spectral-flux onset detector: half-wave rectified frame-to-frame increase of the
 * log-compressed, peak-normalized magnitude spectrum, compared against an adaptive median threshold.
 */
export class OnsetDetector {
  readonly #historySize: number;
  readonly #multiplier: number;
  #delta: number;
  readonly #refractoryFrames: number;
  readonly #compression: number;
  readonly #peakDecay: number;
  readonly #minPeak: number;
  #peak = 0;
  readonly #history: number[] = [];
  #previous: Float32Array | undefined;
  #framesSinceOnset = Number.POSITIVE_INFINITY;

  constructor({
    historySize = 16,
    multiplier = 2,
    delta = 0.1,
    refractoryFrames = 6,
    compression = 100,
    peakDecay = 0.995,
    minPeak = 0.002,
  }: OnsetDetectorOptions = {}) {
    this.#historySize = historySize;
    this.#multiplier = multiplier;
    this.#delta = delta;
    this.#refractoryFrames = refractoryFrames;
    this.#compression = compression;
    this.#peakDecay = peakDecay;
    this.#minPeak = minPeak;
  }

  /** Margin above the adaptive median a frame's flux must exceed; lower detects softer strikes. */
  setDelta(delta: number): void {
    this.#delta = delta;
  }

  /** Processes one magnitude spectrum; `gate` suppresses onsets (e.g. during silence). */
  process(magnitudes: Float32Array, gate = true): OnsetResult {
    let frameMax = 0;
    for (let bin = 0; bin < magnitudes.length; bin++) {
      frameMax = Math.max(frameMax, magnitudes[bin]);
    }
    this.#peak = Math.max(frameMax, this.#peak * this.#peakDecay);
    // Both frames use the current scale so a jump in the normalizer is not itself read as flux.
    const scale = this.#compression / Math.max(this.#peak, this.#minPeak);

    let flux = 0;
    if (this.#previous) {
      for (let bin = 0; bin < magnitudes.length; bin++) {
        const increase = Math.log1p(scale * magnitudes[bin]) - Math.log1p(scale * this.#previous[bin]);
        if (increase > 0) {
          flux += increase;
        }
      }
      flux /= magnitudes.length;
    }
    this.#previous = magnitudes.slice();

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
