//
// Copyright 2026 DXOS.org
//

export type HarmonicPitchOptions = {
  minFrequency: number;
  maxFrequency: number;
  /** Harmonics summed per candidate. */
  harmonics?: number;
  /** Candidate spacing in cents. */
  resolution?: number;
  /** Half-width (bins) of a spectral peak's main lobe; scales with zero-padding. */
  lobe?: number;
};

export type HarmonicPitch = {
  frequency: number;
  /** Fraction of spectral energy lying on the candidate's harmonics (0–1); low for noise. */
  harmonicity: number;
};

/**
 * Harmonic-sum pitch estimate over a magnitude spectrum: each candidate f0 scores
 * Σ m(k·f0)/k, which favours the true fundamental over its sub- and super-harmonics.
 * Applied to the post-onset spectral residual it isolates the newly struck note from
 * notes still ringing.
 */
export const harmonicPitch = (
  magnitudes: Float32Array,
  binWidth: number,
  { minFrequency, maxFrequency, harmonics = 5, resolution = 10, lobe = 2 }: HarmonicPitchOptions,
): HarmonicPitch | undefined => {
  const at = (frequency: number) => {
    const bin = Math.round(frequency / binWidth);
    if (bin <= 0 || bin >= magnitudes.length - 1) {
      return 0;
    }
    return Math.max(magnitudes[bin - 1], magnitudes[bin], magnitudes[bin + 1]);
  };

  let best = 0;
  let bestFrequency = 0;
  const ratio = 2 ** (resolution / 1200);
  for (let frequency = minFrequency; frequency <= maxFrequency; frequency *= ratio) {
    let score = 0;
    for (let harmonic = 1; harmonic <= harmonics; harmonic++) {
      score += at(harmonic * frequency) / harmonic;
    }
    if (score > best) {
      best = score;
      bestFrequency = frequency;
    }
  }

  if (best === 0) {
    return undefined;
  }

  let total = 0;
  const low = Math.floor(minFrequency / binWidth);
  const high = Math.min(magnitudes.length - 1, Math.ceil((maxFrequency * harmonics) / binWidth));
  for (let bin = low; bin <= high; bin++) {
    total += magnitudes[bin];
  }
  let onHarmonics = 0;
  for (let harmonic = 1; harmonic <= harmonics; harmonic++) {
    const bin = Math.round((harmonic * bestFrequency) / binWidth);
    for (let offset = -lobe; offset <= lobe; offset++) {
      onHarmonics += magnitudes[bin + offset] ?? 0;
    }
  }

  return {
    frequency: refine(magnitudes, bestFrequency, binWidth, harmonics, lobe),
    harmonicity: total > 0 ? onHarmonics / total : 0,
  };
};

/**
 * Magnitude-weighted mean of f_k / k over the harmonics, each located by parabolic
 * interpolation of the log spectrum — upper harmonics divide the peak error by k.
 */
const refine = (
  magnitudes: Float32Array,
  frequency: number,
  binWidth: number,
  harmonics: number,
  lobe: number,
): number => {
  let weighted = 0;
  let weights = 0;
  for (let harmonic = 1; harmonic <= harmonics; harmonic++) {
    const center = Math.round((harmonic * frequency) / binWidth);
    let peak = center;
    for (let bin = center - lobe; bin <= center + lobe; bin++) {
      if ((magnitudes[bin] ?? 0) > (magnitudes[peak] ?? 0)) {
        peak = bin;
      }
    }
    const [left, middle, right] = [magnitudes[peak - 1], magnitudes[peak], magnitudes[peak + 1]];
    if (!left || !middle || !right) {
      continue;
    }
    const [logLeft, logMiddle, logRight] = [Math.log(left), Math.log(middle), Math.log(right)];
    const denominator = logLeft - 2 * logMiddle + logRight;
    const offset = denominator === 0 ? 0 : (0.5 * (logLeft - logRight)) / denominator;
    weighted += middle * (((peak + offset) * binWidth) / harmonic);
    weights += middle;
  }
  return weights > 0 ? weighted / weights : frequency;
};
