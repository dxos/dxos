//
// Copyright 2026 DXOS.org
//

import { MagnitudeSpectrum } from './fft.ts';
import { type Pitch } from './pitch.ts';

/** A playable note's sound: its frequency and the relative strength of harmonics 1…n (from calibration). */
export type ChordTemplate = {
  pitch: Pitch;
  frequency: number;
  partials: number[];
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
    return this.#templates
      .map(({ pitch }, index) => ({ pitch, weight: weights[index] }))
      .sort((a, b) => b.weight - a.weight);
  }

  /** Spectrum of `length` samples starting at `start`, computed exactly as {@link decompose} expects. */
  spectrumOf(signal: Float32Array, start: number): Float32Array {
    const frame = new Float32Array(this.#frameSize);
    frame.set(signal.subarray(start, start + this.#frameSize));
    return this.#spectrum.compute(frame, new Float32Array(this.#spectrum.size / 2));
  }

  /** Renders the template as steady sinusoids through the same window, so its peak shapes match observations. */
  #render({ frequency, partials }: ChordTemplate): Float64Array {
    const frame = new Float32Array(this.#frameSize);
    for (let index = 0; index < frame.length; index++) {
      const time = index / this.#sampleRate;
      let value = 0;
      partials.forEach((amplitude, harmonic) => {
        value += amplitude * Math.sin(2 * Math.PI * frequency * (harmonic + 1) * time);
      });
      frame[index] = value;
    }
    const magnitudes = this.#spectrum.compute(frame, new Float32Array(this.#spectrum.size / 2));
    const column = Float64Array.from(magnitudes.subarray(0, this.#bins));
    const norm = Math.sqrt(dot(column, column)) || 1;
    return column.map((value) => value / norm);
  }
}

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
