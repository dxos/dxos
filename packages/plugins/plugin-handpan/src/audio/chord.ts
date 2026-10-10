//
// Copyright 2026 DXOS.org
//

import { MagnitudeSpectrum } from './fft.ts';
import { type Pitch } from './pitch.ts';

/** A spectral peak; amplitudes are relative to the strongest peak of the same spectrum. */
export type SpectralPeak = {
  frequency: number;
  amplitude: number;
};

/** A playable note's sound: its frequency and the relative strength of harmonics 1…n (from calibration). */
export type ChordTemplate = {
  pitch: Pitch;
  frequency: number;
  partials: number[];
  /**
   * The note's measured spectrum as peaks, including fields that ring in sympathy when it is struck.
   * Preferred over `partials`: it attributes that resonance to the note rather than to other notes.
   */
  peaks?: SpectralPeak[];
};

export type ChordDecomposerOptions = {
  sampleRate: number;
  /** Analysis window (samples); must match the window the observed spectrum was computed over. */
  frameSize?: number;
  /** Zero-padding factor of the spectrum. */
  padding?: number;
  /** Bins above this frequency are ignored (handpan energy sits well below). */
  maxFrequency?: number;
  /** Multiplicative-update iterations. */
  iterations?: number;
};

export type NoteWeight = {
  pitch: Pitch;
  /** Contribution of the note to the spectrum (template columns are unit length). */
  weight: number;
};

/**
 * Explains a spectrum as a non-negative mix of known note spectra (NNLS over a fixed dictionary).
 * With only the instrument's 8–9 notes as candidates, a note's own octave and twelfth partials are
 * attributed to it rather than read as separate notes, which is what defeats generic polyphonic
 * pitch detection on a handpan.
 */
export class ChordDecomposer {
  readonly #templates: ChordTemplate[];
  readonly #bins: number;
  readonly #iterations: number;
  readonly #spectrum: MagnitudeSpectrum;
  readonly #frameSize: number;
  readonly #sampleRate: number;
  /** Unit-length template spectra, one per note, over the first `#bins` bins. */
  readonly #dictionary: Float64Array[];
  /** Gram matrix DᵀD. */
  readonly #gram: number[][];

  constructor(
    templates: ChordTemplate[],
    { sampleRate, frameSize = 8192, padding = 2, maxFrequency = 4000, iterations = 300 }: ChordDecomposerOptions,
  ) {
    this.#templates = templates;
    this.#sampleRate = sampleRate;
    this.#frameSize = frameSize;
    this.#iterations = iterations;
    this.#spectrum = new MagnitudeSpectrum(frameSize, frameSize * padding);
    this.#bins = Math.min(this.#spectrum.size / 2, Math.ceil((maxFrequency * this.#spectrum.size) / sampleRate));
    this.#dictionary = templates.map((template) => this.#render(template));
    this.#gram = this.#dictionary.map((row) => this.#dictionary.map((column) => dot(row, column)));
  }

  /** Weights of each template in `magnitudes` (a spectrum from the same window and padding), strongest first. */
  decompose(magnitudes: Float32Array): NoteWeight[] {
    return this.analyze(magnitudes).weights;
  }

  /**
   * Weights plus `fit`: the fraction of the spectrum's energy the weighted templates explain (0–1).
   * A strike of the instrument's notes fits well; a tak or room noise does not.
   */
  analyze(magnitudes: Float32Array): { weights: NoteWeight[]; fit: number } {
    const count = this.#dictionary.length;
    const projection = this.#dictionary.map((column) => dot(column, magnitudes));
    const weights = new Float64Array(count).fill(1);
    for (let iteration = 0; iteration < this.#iterations; iteration++) {
      for (let index = 0; index < count; index++) {
        let denominator = 1e-12;
        for (let other = 0; other < count; other++) {
          denominator += this.#gram[index][other] * weights[other];
        }
        weights[index] *= projection[index] / denominator;
      }
    }
    let error = 0;
    let energy = 0;
    for (let bin = 0; bin < this.#bins; bin++) {
      let model = 0;
      for (let index = 0; index < count; index++) {
        model += this.#dictionary[index][bin] * weights[index];
      }
      const observed = magnitudes[bin] ?? 0;
      error += (observed - model) ** 2;
      energy += observed ** 2;
    }
    return {
      weights: this.#templates
        .map(({ pitch }, index) => ({ pitch, weight: weights[index] }))
        .sort((a, b) => b.weight - a.weight),
      fit: energy > 0 ? Math.max(0, 1 - error / energy) : 0,
    };
  }

  /** Spectrum of `length` samples starting at `start`, computed exactly as {@link decompose} expects. */
  spectrumOf(signal: Float32Array, start: number): Float32Array {
    const frame = new Float32Array(this.#frameSize);
    frame.set(signal.subarray(start, start + this.#frameSize));
    return this.#spectrum.compute(frame, new Float32Array(this.#spectrum.size / 2));
  }

  /** Renders the template as steady sinusoids through the same window, so its peak shapes match observations. */
  #render({ frequency, partials, peaks }: ChordTemplate): Float64Array {
    const components = peaks?.length
      ? peaks
      : partials.map((amplitude, harmonic) => ({ frequency: frequency * (harmonic + 1), amplitude }));
    const frame = new Float32Array(this.#frameSize);
    for (let index = 0; index < frame.length; index++) {
      const time = index / this.#sampleRate;
      let value = 0;
      for (const component of components) {
        value += component.amplitude * Math.sin(2 * Math.PI * component.frequency * time);
      }
      frame[index] = value;
    }
    const magnitudes = this.#spectrum.compute(frame, new Float32Array(this.#spectrum.size / 2));
    const column = Float64Array.from(magnitudes.subarray(0, this.#bins));
    const norm = Math.sqrt(dot(column, column)) || 1;
    return column.map((value) => value / norm);
  }
}

export type SpectralPeaksOptions = {
  maxFrequency?: number;
  /** Most peaks kept, strongest first. */
  count?: number;
  /** Peaks below this fraction of the strongest are ignored (above the Hann window's −31 dB side lobes). */
  floor?: number;
};

/** Local maxima of a magnitude spectrum, located by parabolic interpolation of the log magnitude. */
export const spectralPeaks = (
  magnitudes: Float32Array,
  binWidth: number,
  { maxFrequency = 4000, count = 24, floor = 0.04 }: SpectralPeaksOptions = {},
): SpectralPeak[] => {
  const last = Math.min(magnitudes.length - 2, Math.floor(maxFrequency / binWidth));
  let strongest = 0;
  for (let bin = 1; bin <= last; bin++) {
    strongest = Math.max(strongest, magnitudes[bin]);
  }
  if (strongest === 0) {
    return [];
  }
  const peaks: SpectralPeak[] = [];
  for (let bin = 1; bin <= last; bin++) {
    const [left, middle, right] = [magnitudes[bin - 1], magnitudes[bin], magnitudes[bin + 1]];
    if (middle < floor * strongest || middle <= left || middle < right) {
      continue;
    }
    const [logLeft, logMiddle, logRight] = [Math.log(left + 1e-12), Math.log(middle), Math.log(right + 1e-12)];
    const denominator = logLeft - 2 * logMiddle + logRight;
    const offset = denominator === 0 ? 0 : (0.5 * (logLeft - logRight)) / denominator;
    peaks.push({ frequency: (bin + offset) * binWidth, amplitude: middle / strongest });
  }
  return peaks.sort((a, b) => b.amplitude - a.amplitude).slice(0, count);
};

/**
 * Averages the peaks of several strikes of one note: peaks within `tolerance` cents are the same
 * component; components heard in fewer than half the strikes (noise, a stray resonance) are dropped.
 */
export const mergePeaks = (
  strikes: SpectralPeak[][],
  { tolerance = 30 }: { tolerance?: number } = {},
): SpectralPeak[] => {
  const clusters: { frequency: number; total: number; hits: number }[] = [];
  for (const peaks of strikes) {
    for (const peak of peaks) {
      const cluster = clusters.find(
        ({ frequency }) => Math.abs(1200 * Math.log2(peak.frequency / frequency)) <= tolerance,
      );
      if (cluster) {
        cluster.frequency = (cluster.frequency * cluster.hits + peak.frequency) / (cluster.hits + 1);
        cluster.total += peak.amplitude;
        cluster.hits++;
      } else {
        clusters.push({ frequency: peak.frequency, total: peak.amplitude, hits: 1 });
      }
    }
  }
  return clusters
    .filter(({ hits }) => hits * 2 >= strikes.length)
    .map(({ frequency, total }) => ({ frequency, amplitude: total / strikes.length }))
    .sort((a, b) => b.amplitude - a.amplitude);
};

/** Notes whose weight is at least `relative` of the strongest. */
export const selectNotes = (weights: NoteWeight[], { relative = 0.3 }: { relative?: number } = {}): Pitch[] => {
  const strongest = weights[0]?.weight ?? 0;
  return strongest > 0 ? weights.filter(({ weight }) => weight >= relative * strongest).map(({ pitch }) => pitch) : [];
};

const dot = (a: ArrayLike<number>, b: ArrayLike<number>): number => {
  let sum = 0;
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index++) {
    sum += a[index] * b[index];
  }
  return sum;
};
